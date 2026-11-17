import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as bookingService from "@/server/modules/booking/booking.service";
import * as financeService from "@/server/modules/finance/finance.service";
import { pool } from "@/server/db/client";
import { addDays, createHotel, createUser, expectStatus, insertBooking, resetDb, today } from "../helpers";

beforeEach(resetDb);
afterAll(() => pool.end());

describe("finance (F-13)", () => {
  it("summary totals match the CSV export for the same period", async () => {
    const admin = await createUser("admin");
    const guest = await createUser();
    const h = await createHotel({ rooms: 10 });
    const refs: string[] = [];
    for (let i = 0; i < 3; i++) {
      const b = await insertBooking({ userId: guest.id, hotelId: h.id, checkIn: addDays(today(), 10 + i * 3) });
      await bookingService.approve(admin, b.id);
      refs.push(b.ref);
    }
    await bookingService.cancel(guest, refs[0]!);
    await insertBooking({ userId: guest.id, hotelId: h.id, checkIn: addDays(today(), 40) }); // pending

    const summary = await financeService.summary({ from: "", to: "" });
    expect(summary).toMatchObject({
      confirmedRevenueCents: 2 * 22_400,
      approvedBookings: 3,
      refundedCents: 22_400,
      cancellations: 1,
      pendingRequests: 1,
      awaitingCents: 22_400,
      averageBookingCents: 22_400,
    });
    expect(summary.byMonth).toHaveLength(6);

    const { csv } = await financeService.transactionsCsv({ from: "", to: "" });
    const total = csv
      .trim()
      .split("\n")
      .slice(1)
      .reduce((s, line) => s + Math.round(Number(line.split(",").at(-1)) * 100), 0);
    expect(total).toBe(summary.confirmedRevenueCents);
    expect(summary.byMonth.reduce((s, m) => s + m.netCents, 0)).toBe(total);

    const txs = await financeService.transactions({ from: "", to: "", page: 1, limit: 2 });
    expect(txs.pagination).toEqual({ page: 1, limit: 2, totalDocs: 4, totalPages: 2 });
  });

  it("guards CSV text cells against formula injection only", async () => {
    const admin = await createUser("admin");
    const guest = await createUser();
    const h = await createHotel({ rooms: 2, name: "=HYPERLINK(1)" });
    const b = await insertBooking({ userId: guest.id, hotelId: h.id });
    await bookingService.approve(admin, b.id);
    await bookingService.cancel(guest, b.ref);
    const { csv } = await financeService.transactionsCsv({ from: "", to: "" });
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv).toContain(",-224.00");
  });

  it("rejects a reversed period", async () => {
    await expectStatus(financeService.summary({ from: "2026-06", to: "2026-01" }), 400);
  });
});
