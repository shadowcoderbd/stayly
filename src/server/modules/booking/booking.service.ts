import "server-only";
import { serverEnv } from "@/server/config/env";
import { db } from "@/server/db/client";
import type { Actor } from "@/server/lib/auth";
import { nightsBetween, today } from "@/server/lib/dates";
import { BadRequestError, ConflictError, NotFoundError, TooManyRequestsError } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import * as hotelRepo from "@/server/modules/hotel/hotel.repository";
import { toPage } from "@/types/api";
import { quote } from "./booking.pricing";
import * as bookingRepo from "./booking.repository";
import type {
  AdminBookingPage,
  AdminBookingsQuery,
  BookingCounts,
  BookingDecision,
  BookingDetail,
  BookingPage,
  BookingStatus,
  CancelResult,
  CreateBookingInput,
  CreatedBooking,
  MyBookingsQuery,
} from "./booking.types";

/* ───────── Request (spec F-05) ───────── */

export async function create(actor: Actor, input: CreateBookingInput): Promise<CreatedBooking> {
  if (input.checkIn < today()) throw new BadRequestError("checkIn: Check-in can't be in the past.");

  return db.transaction(async (tx) => {
    // Serialize requests per user so the overlap and pending-limit checks can't race.
    await bookingRepo.lockUser(tx, actor.id);

    const h = await hotelRepo.findBookable(tx, input.hotelId);
    if (!h) throw new NotFoundError("Hotel not found.");

    if ((await hotelRepo.roomsLeft(tx, h.id, h.rooms, input.checkIn, input.checkOut)) <= 0)
      throw new ConflictError("This hotel is fully booked for these dates.");

    const overlap = await bookingRepo.findOverlap(tx, { userId: actor.id, hotelId: h.id, checkIn: input.checkIn, checkOut: input.checkOut });
    if (overlap) throw new ConflictError(`You already have booking ${overlap.ref} at ${h.name} for overlapping dates.`);

    const max = serverEnv.MAX_PENDING_PER_USER;
    if ((await bookingRepo.countPending(tx, actor.id)) >= max)
      throw new TooManyRequestsError(`You can have at most ${max} pending requests. Wait for a decision or cancel one.`);

    const created = await bookingRepo.insert(tx, {
      userId: actor.id,
      hotelId: h.id,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      ...quote(h.nightlyRateCents, nightsBetween(input.checkIn, input.checkOut)),
    });

    logger.info({ event: "booking.requested", bookingId: created.id, ref: created.ref, actor: actor.id });
    return created;
  });
}

/* ───────── Customer reads (spec F-06 / F-07) ───────── */

export async function listMine(actor: Actor, p: MyBookingsQuery): Promise<BookingPage> {
  const { items, total } = await bookingRepo.listByUser(actor.id, p);
  return toPage(items, { page: p.page, limit: p.limit, totalDocs: total });
}

function toCounts(by: Partial<Record<BookingStatus, number>>): BookingCounts {
  const counts = { pending: by.pending ?? 0, approved: by.approved ?? 0, rejected: by.rejected ?? 0, cancelled: by.cancelled ?? 0 };
  return { all: counts.pending + counts.approved + counts.rejected + counts.cancelled, ...counts };
}

export const countsMine = async (actor: Actor) => toCounts(await bookingRepo.countByStatus(actor.id));

/** For pages: null when the booking doesn't exist or isn't yours. */
export async function findMine(actor: Actor, ref: string): Promise<BookingDetail | null> {
  const b = await bookingRepo.findByRefForUser(ref, actor.id);
  return b && { ...b, transactions: await bookingRepo.listTransactions(b.id) };
}

export async function getMine(actor: Actor, ref: string): Promise<BookingDetail> {
  const detail = await findMine(actor, ref);
  if (!detail) throw new NotFoundError("Booking not found.");
  return detail;
}

/* ───────── Admin reads (spec F-12) ───────── */

export async function listForAdmin(p: AdminBookingsQuery): Promise<AdminBookingPage> {
  const { items, total } = await bookingRepo.listAll(p);
  return toPage(items, { page: p.page, limit: p.limit, totalDocs: total });
}

export const countsForAdmin = async () => toCounts(await bookingRepo.countByStatus());

/* ───────── State transitions (spec §4.7) ───────── */

const notFound = () => new NotFoundError("Booking not found.");
const stateConflict = (status: BookingStatus) => new ConflictError(`This booking is already ${status}.`);

export async function approve(actor: Actor, bookingId: string): Promise<BookingDecision> {
  return db.transaction(async (tx) => {
    const b = await bookingRepo.lock(tx, { id: bookingId });
    if (!b) throw notFound();
    if (b.status !== "pending") throw stateConflict(b.status);
    if (b.checkIn < today()) throw new ConflictError("The check-in date has passed. Reject this request instead.");

    // Lock the hotel row so two concurrent approvals can't both take the last room.
    const rooms = (await hotelRepo.lockRooms(tx, b.hotelId)) ?? 0;
    if ((await hotelRepo.roomsLeft(tx, b.hotelId, rooms, b.checkIn, b.checkOut)) <= 0)
      throw new ConflictError("No rooms left for these dates. Reject this request instead.");

    await bookingRepo.update(tx, b.id, { status: "approved", decidedBy: actor.id, decidedAt: new Date() });
    await bookingRepo.insertTransaction(tx, { bookingId: b.id, type: "payment", amountCents: b.totalCents });

    logger.info({ event: "booking.approved", bookingId: b.id, ref: b.ref, actor: actor.id });
    return { id: b.id, ref: b.ref, status: "approved" };
  });
}

export async function reject(actor: Actor, bookingId: string, reason: string): Promise<BookingDecision> {
  return db.transaction(async (tx) => {
    const b = await bookingRepo.lock(tx, { id: bookingId });
    if (!b) throw notFound();
    if (b.status !== "pending") throw stateConflict(b.status);
    await bookingRepo.update(tx, b.id, { status: "rejected", rejectionReason: reason, decidedBy: actor.id, decidedAt: new Date() });
    logger.info({ event: "booking.rejected", bookingId: b.id, ref: b.ref, actor: actor.id });
    return { id: b.id, ref: b.ref, status: "rejected" };
  });
}

/** Cancel your own booking. Approved ones are refunded in full inside the free-cancellation window. */
export async function cancel(actor: Actor, ref: string): Promise<CancelResult> {
  return db.transaction(async (tx) => {
    const b = await bookingRepo.lock(tx, { ref, userId: actor.id });
    if (!b) throw notFound();
    if (b.status !== "pending" && b.status !== "approved") throw stateConflict(b.status);

    let refundCents = 0;
    if (b.status === "approved") {
      if (!(await bookingRepo.isWithinCancelWindow(tx, b.id)))
        throw new ConflictError("The free-cancellation window for this booking has passed. Contact the hotel to change it.");
      refundCents = b.totalCents;
      await bookingRepo.insertTransaction(tx, { bookingId: b.id, type: "refund", amountCents: refundCents });
    }

    await bookingRepo.update(tx, b.id, { status: "cancelled", cancelledAt: new Date() });
    logger.info({ event: "booking.cancelled", bookingId: b.id, ref: b.ref, actor: actor.id, refundCents });
    return { id: b.id, ref: b.ref, status: "cancelled", refundCents };
  });
}
