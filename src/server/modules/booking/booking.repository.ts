import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { serverEnv } from "@/server/config/env";
import { db, type DbOrTx } from "@/server/db/client";
import { booking, hotel, transaction, user } from "@/server/db/schema";
import { today } from "@/server/lib/dates";
import { cardColumns, hotelRef, roomsLeftSql, toCard } from "@/server/modules/hotel/hotel.repository";
import type { AdminBooking, AdminBookingsQuery, Booking, BookingStatus, MyBookingsQuery, Transaction } from "./booking.types";

// Database access for bookings and their transactions. No business rules: missing rows come back as null.

/* ───────── Shared SQL fragments ───────── */

/** Check-in day at the hotel's check-in time (in APP_TIMEZONE), minus the free-cancellation window. */
const cancelDeadline = sql<Date>`((${booking.checkIn} + ${hotel.checkInTime}) at time zone ${serverEnv.APP_TIMEZONE}) - make_interval(hours => ${hotel.freeCancellationHours})`;
const canCancel = sql<boolean>`(${booking.status} = 'pending' or (${booking.status} = 'approved' and now() <= ${cancelDeadline}))`;

const bookingColumns = {
  id: booking.id,
  ref: booking.ref,
  status: booking.status,
  checkIn: booking.checkIn,
  checkOut: booking.checkOut,
  nights: booking.nights,
  guests: booking.guests,
  nightlyRateCents: booking.nightlyRateCents,
  subtotalCents: booking.subtotalCents,
  taxCents: booking.taxCents,
  totalCents: booking.totalCents,
  rejectionReason: booking.rejectionReason,
  createdAt: booking.createdAt,
  decidedAt: booking.decidedAt,
  cancelledAt: booking.cancelledAt,
  cancelDeadline,
  canCancel,
  hotel: cardColumns,
};

const selectBookings = () => db.select(bookingColumns).from(booking).innerJoin(hotel, eq(hotel.id, booking.hotelId));
type BookingRow = Awaited<ReturnType<typeof selectBookings>>[number];

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d ? new Date(String(d)).toISOString() : null);

function toBooking({ hotel: h, cancelDeadline: deadline, canCancel: cancellable, ...row }: BookingRow): Booking {
  const card = toCard(h);
  return {
    id: row.id,
    ref: row.ref,
    status: row.status,
    isCompleted: row.status === "approved" && row.checkOut < today(),
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    nights: row.nights,
    guests: row.guests,
    nightlyRateCents: row.nightlyRateCents,
    subtotalCents: row.subtotalCents,
    taxCents: row.taxCents,
    totalCents: row.totalCents,
    rejectionReason: row.rejectionReason,
    createdAt: iso(row.createdAt)!,
    decidedAt: iso(row.decidedAt),
    cancelledAt: iso(row.cancelledAt),
    cancelDeadline: iso(deadline)!,
    canCancel: Boolean(cancellable),
    hotel: { id: card.id, slug: card.slug, name: card.name, city: card.city, country: card.country, cover: card.cover },
  };
}

const likeTerm = (s: string) => `%${s.replace(/[%_\\]/g, "\\$&")}%`;

/* ───────── Writes used by the request flow ───────── */

/** Serializes one user's booking requests until the transaction ends. */
export async function lockUser(tx: DbOrTx, userId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
}

/** A pending or approved booking by this user at this hotel overlapping [checkIn, checkOut), or null. */
export async function findOverlap(tx: DbOrTx, p: { userId: string; hotelId: string; checkIn: string; checkOut: string }) {
  const [row] = await tx
    .select({ ref: booking.ref })
    .from(booking)
    .where(
      and(
        eq(booking.userId, p.userId),
        eq(booking.hotelId, p.hotelId),
        inArray(booking.status, ["pending", "approved"]),
        sql`${booking.checkIn} < ${p.checkOut}::date and ${booking.checkOut} > ${p.checkIn}::date`,
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function countPending(tx: DbOrTx, userId: string) {
  const [row] = await tx
    .select({ n: count() })
    .from(booking)
    .where(and(eq(booking.userId, userId), eq(booking.status, "pending")));
  return row?.n ?? 0;
}

export async function insert(tx: DbOrTx, values: typeof booking.$inferInsert) {
  const [row] = await tx.insert(booking).values(values).returning({ id: booking.id, ref: booking.ref });
  return row!;
}

/* ───────── Reads ───────── */

export async function listByUser(userId: string, p: MyBookingsQuery): Promise<{ items: Booking[]; total: number }> {
  const where = and(eq(booking.userId, userId), p.status === "all" ? undefined : eq(booking.status, p.status));
  const [rows, [total]] = await Promise.all([
    selectBookings()
      .where(where)
      .orderBy(desc(booking.createdAt))
      .limit(p.limit)
      .offset((p.page - 1) * p.limit),
    db.select({ n: count() }).from(booking).where(where),
  ]);
  return { items: rows.map(toBooking), total: total?.n ?? 0 };
}

/** Number of bookings per status, optionally for one user. */
export async function countByStatus(userId?: string): Promise<Partial<Record<BookingStatus, number>>> {
  const rows = await db
    .select({ status: booking.status, n: count() })
    .from(booking)
    .where(userId ? eq(booking.userId, userId) : undefined)
    .groupBy(booking.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

export async function findByRefForUser(ref: string, userId: string): Promise<Booking | null> {
  const [row] = await selectBookings()
    .where(and(eq(booking.ref, ref), eq(booking.userId, userId)))
    .limit(1);
  return row ? toBooking(row) : null;
}

export async function listTransactions(bookingId: string): Promise<Transaction[]> {
  const rows = await db.select().from(transaction).where(eq(transaction.bookingId, bookingId)).orderBy(asc(transaction.createdAt));
  return rows.map((t) => ({ id: t.id, type: t.type, amountCents: t.amountCents, createdAt: t.createdAt.toISOString() }));
}

export async function listAll(p: AdminBookingsQuery): Promise<{ items: AdminBooking[]; total: number }> {
  const conds: SQL[] = [];
  if (p.status !== "all") conds.push(eq(booking.status, p.status));
  if (p.hotelId) conds.push(eq(booking.hotelId, p.hotelId));
  if (p.search) {
    const term = likeTerm(p.search);
    conds.push(or(ilike(booking.ref, term), ilike(user.name, term), ilike(user.email, term))!);
  }
  const where = and(...conds);
  const roomsLeft = sql<number | null>`case when ${booking.status} = 'pending'
    then ${roomsLeftSql(hotelRef.id, hotelRef.rooms, sql`"booking"."check_in"`, sql`"booking"."check_out"`)} end`;

  const [rows, [total]] = await Promise.all([
    db
      .select({ ...bookingColumns, roomsLeft, guest: { id: user.id, name: user.name, email: user.email } })
      .from(booking)
      .innerJoin(hotel, eq(hotel.id, booking.hotelId))
      .innerJoin(user, eq(user.id, booking.userId))
      .where(where)
      // FIFO for the pending queue, newest first elsewhere.
      .orderBy(p.status === "pending" ? asc(booking.createdAt) : desc(booking.createdAt))
      .limit(p.limit)
      .offset((p.page - 1) * p.limit),
    db
      .select({ n: count() })
      .from(booking)
      .innerJoin(user, eq(user.id, booking.userId))
      .where(where),
  ]);

  const items = rows.map<AdminBooking>(({ guest, roomsLeft: left, ...r }) => ({
    ...toBooking(r),
    guest,
    roomsLeft: left === null ? null : Math.max(0, Number(left)),
  }));
  return { items, total: total?.n ?? 0 };
}

/* ───────── State transitions (run inside the service's transaction) ───────── */

/** Locks a booking row (FOR UPDATE), by id or by ref + owner. */
export async function lock(tx: DbOrTx, by: { id: string } | { ref: string; userId: string }) {
  const where = "id" in by ? eq(booking.id, by.id) : and(eq(booking.ref, by.ref), eq(booking.userId, by.userId));
  const [row] = await tx.select().from(booking).where(where).for("update").limit(1);
  return row ?? null;
}

export async function update(tx: DbOrTx, id: string, values: Partial<typeof booking.$inferInsert>) {
  await tx.update(booking).set(values).where(eq(booking.id, id));
}

export async function isWithinCancelWindow(tx: DbOrTx, id: string) {
  const [row] = await tx
    .select({ ok: sql<boolean>`now() <= ${cancelDeadline}` })
    .from(booking)
    .innerJoin(hotel, eq(hotel.id, booking.hotelId))
    .where(eq(booking.id, id));
  return Boolean(row?.ok);
}

export async function insertTransaction(tx: DbOrTx, values: typeof transaction.$inferInsert) {
  await tx.insert(transaction).values(values);
}
