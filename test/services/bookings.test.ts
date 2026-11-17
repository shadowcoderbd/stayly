import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { quote } from "@/server/modules/booking/booking.pricing";
import * as bookingService from "@/server/modules/booking/booking.service";
import * as hotelRepo from "@/server/modules/hotel/hotel.repository";
import * as hotelService from "@/server/modules/hotel/hotel.service";
import { db, pool } from "@/server/db/client";
import { booking, transaction } from "@/server/db/schema";
import { addDays, createHotel, createUser, expectStatus, insertBooking, resetDb, today } from "../helpers";

beforeEach(resetDb);
afterAll(() => pool.end());

const search = (p: { checkIn?: string; checkOut?: string } = {}) =>
  hotelService.search({ page: 1, limit: 12, q: "", location: "", checkIn: p.checkIn ?? "", checkOut: p.checkOut ?? "" });

describe("pricing", () => {
  it("matches the design: $142 × 3 nights + 12% tax", () => {
    expect(quote(14_200, 3, 0.12)).toEqual({
      nights: 3,
      nightlyRateCents: 14_200,
      subtotalCents: 42_600,
      taxCents: 5_112,
      totalCents: 47_712,
    });
  });
});

describe("availability (spec §4.8)", () => {
  it("counts approved bookings per night, ignores pending, treats check-out day as free", async () => {
    const guest = await createUser();
    const h = await createHotel({ rooms: 1 });
    const d = addDays(today(), 10);
    await insertBooking({ userId: guest.id, hotelId: h.id, checkIn: d, checkOut: addDays(d, 3), status: "approved" });
    await insertBooking({ userId: guest.id, hotelId: h.id, checkIn: addDays(d, 5), checkOut: addDays(d, 7), status: "pending" });

    expect(await hotelRepo.roomsLeft(db, h.id, 1, addDays(d, 2), addDays(d, 4))).toBe(0); // overlaps last night
    expect(await hotelRepo.roomsLeft(db, h.id, 1, addDays(d, 3), addDays(d, 5))).toBe(1); // starts on check-out day
    expect(await hotelRepo.roomsLeft(db, h.id, 1, addDays(d, 5), addDays(d, 7))).toBe(1); // pending holds nothing
  });

  it("search with dates hides fully booked hotels and returns a Page", async () => {
    const guest = await createUser();
    const full = await createHotel({ rooms: 1, name: "Full House", slug: "full-house" });
    await createHotel({ rooms: 1, name: "Open House", slug: "open-house" });
    const d = addDays(today(), 10);
    await insertBooking({ userId: guest.id, hotelId: full.id, checkIn: d, checkOut: addDays(d, 2), status: "approved" });

    const page = await search({ checkIn: d, checkOut: addDays(d, 1) });
    expect(page.items.map((h) => h.name)).toEqual(["Open House"]);
    expect(page.pagination).toEqual({ page: 1, limit: 12, totalDocs: 1, totalPages: 1 });
    expect(page.items[0]?.cover?.url).toBe("/api/uploads/hotels/x.webp");
  });

  it("refuses check-in dates in the past", async () => {
    await expectStatus(search({ checkIn: addDays(today(), -2), checkOut: addDays(today(), -1) }), 400);
  });
});

describe("booking requests (F-05)", () => {
  it("creates a pending request with a server-side price snapshot", async () => {
    const guest = await createUser();
    const h = await createHotel({ nightlyRateCents: 14_200, rooms: 5 });
    const checkIn = addDays(today(), 10);
    const created = await bookingService.create(guest, { hotelId: h.id, checkIn, checkOut: addDays(checkIn, 3), guests: 2 });
    expect(created.ref).toMatch(/^HB-\d+$/);
    const [row] = await db.select().from(booking).where(eq(booking.id, created.id));
    expect(row).toMatchObject({ status: "pending", nights: 3, totalCents: 47_712 });
  });

  it("rejects overlapping requests by the same guest and past dates", async () => {
    const guest = await createUser();
    const h = await createHotel({ rooms: 5 });
    const checkIn = addDays(today(), 10);
    const input = { hotelId: h.id, checkIn, checkOut: addDays(checkIn, 2), guests: 2 };
    await bookingService.create(guest, input);
    await expectStatus(bookingService.create(guest, input), 409);
    await expectStatus(bookingService.create(guest, { ...input, checkIn: addDays(today(), -1), checkOut: today() }), 400);
  });

  it("caps pending requests per guest", async () => {
    const guest = await createUser();
    for (let i = 0; i < 5; i++) {
      const h = await createHotel({ rooms: 5 });
      await insertBooking({ userId: guest.id, hotelId: h.id });
    }
    const h = await createHotel({ rooms: 5 });
    const checkIn = addDays(today(), 10);
    await expectStatus(bookingService.create(guest, { hotelId: h.id, checkIn, checkOut: addDays(checkIn, 1), guests: 1 }), 429);
  });

  it("only shows a guest their own bookings", async () => {
    const a = await createUser();
    const b = await createUser();
    const h = await createHotel();
    const mine = await insertBooking({ userId: a.id, hotelId: h.id });
    await expectStatus(bookingService.getMine(b, mine.ref), 404);
    expect((await bookingService.listMine(b, { status: "all", page: 1, limit: 10 })).items).toHaveLength(0);
    expect((await bookingService.listMine(a, { status: "all", page: 1, limit: 10 })).items).toHaveLength(1);
  });
});

describe("state machine (spec §4.7)", () => {
  it("approve records exactly one payment; a second approve is a 409", async () => {
    const admin = await createUser("admin");
    const guest = await createUser();
    const h = await createHotel({ rooms: 2 });
    const b = await insertBooking({ userId: guest.id, hotelId: h.id });

    expect(await bookingService.approve(admin, b.id)).toMatchObject({ status: "approved", ref: b.ref });
    await expectStatus(bookingService.approve(admin, b.id), 409);
    const txs = await db.select().from(transaction).where(eq(transaction.bookingId, b.id));
    expect(txs).toMatchObject([{ type: "payment", amountCents: 22_400 }]);
  });

  it("reject only works on pending and stores the reason", async () => {
    const admin = await createUser("admin");
    const guest = await createUser();
    const h = await createHotel();
    const b = await insertBooking({ userId: guest.id, hotelId: h.id });
    await bookingService.reject(admin, b.id, "No rooms that week.");
    await expectStatus(bookingService.reject(admin, b.id, "No rooms that week."), 409);
    const [row] = await db.select().from(booking).where(eq(booking.id, b.id));
    expect(row?.rejectionReason).toBe("No rooms that week.");
  });

  it("cancelling a pending request records no money movement", async () => {
    const guest = await createUser();
    const h = await createHotel();
    const b = await insertBooking({ userId: guest.id, hotelId: h.id });
    expect(await bookingService.cancel(guest, b.ref)).toMatchObject({ status: "cancelled", refundCents: 0 });
    expect(await db.select().from(transaction)).toHaveLength(0);
  });

  it("only the owner can cancel", async () => {
    const owner = await createUser();
    const other = await createUser();
    const h = await createHotel();
    const b = await insertBooking({ userId: owner.id, hotelId: h.id });
    await expectStatus(bookingService.cancel(other, b.ref), 404);
  });

  it("cancelling an approved booking inside the window refunds it in full", async () => {
    const admin = await createUser("admin");
    const guest = await createUser();
    const h = await createHotel({ rooms: 2 });
    const b = await insertBooking({ userId: guest.id, hotelId: h.id, checkIn: addDays(today(), 10) });
    await bookingService.approve(admin, b.id);

    expect(await bookingService.cancel(guest, b.ref)).toMatchObject({ status: "cancelled", refundCents: 22_400 });
    const types = (await db.select().from(transaction).where(eq(transaction.bookingId, b.id))).map((t) => t.type).sort();
    expect(types).toEqual(["payment", "refund"]);
  });

  it("blocks cancelling an approved booking after the free-cancellation cutoff", async () => {
    const guest = await createUser();
    const h = await createHotel({ freeCancellationHours: 48 });
    const b = await insertBooking({ userId: guest.id, hotelId: h.id, checkIn: addDays(today(), 1), status: "approved" });
    await expectStatus(bookingService.cancel(guest, b.ref), 409);
    expect((await bookingService.getMine(guest, b.ref)).canCancel).toBe(false);
  });

  it("concurrent approvals can't overbook the last room", async () => {
    const admin = await createUser("admin");
    const [g1, g2, g3] = await Promise.all([createUser(), createUser(), createUser()]);
    const h = await createHotel({ rooms: 1 });
    const d = addDays(today(), 10);
    const reqs = await Promise.all(
      [g1!, g2!, g3!].map((g) => insertBooking({ userId: g.id, hotelId: h.id, checkIn: d, checkOut: addDays(d, 2) })),
    );

    const results = await Promise.allSettled(reqs.map((b) => bookingService.approve(admin, b.id)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected").map((r) => (r as PromiseRejectedResult).reason.statusCode)).toEqual([409, 409]);
    expect(await hotelRepo.roomsLeft(db, h.id, 1, d, addDays(d, 2))).toBe(0);
    expect(await db.select().from(transaction)).toHaveLength(1);
  });

  it("admin list shows rooms left on pending rows, FIFO", async () => {
    const guest = await createUser();
    const h = await createHotel({ rooms: 3 });
    const first = await insertBooking({ userId: guest.id, hotelId: h.id });
    await insertBooking({ userId: guest.id, hotelId: h.id, checkIn: addDays(today(), 20) });
    const page = await bookingService.listForAdmin({ status: "pending", hotelId: "", search: "", page: 1, limit: 20 });
    expect(page.items[0]?.ref).toBe(first.ref);
    expect(page.items.every((b) => b.roomsLeft === 3)).toBe(true);
  });
});
