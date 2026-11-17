import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/server/lib/auth";
import { pool } from "@/server/db/client";
import { addDays, callRoute, createHotel, createUser, insertBooking, resetDb, today } from "./helpers";

// Route handlers read the session through getSession(); tests choose who is calling.
const session = vi.hoisted(() => ({ current: null as Actor | null }));
vi.mock("@/server/lib/auth", () => ({
  getSession: async () => (session.current ? { user: session.current, session: {} } : null),
}));
const as = (actor: Actor | null) => (session.current = actor);

const bookings = await import("@/app/api/v1/bookings/route");
const bookingByRef = await import("@/app/api/v1/bookings/[ref]/route");
const adminBookings = await import("@/app/api/v1/admin/bookings/route");
const approve = await import("@/app/api/v1/admin/bookings/[id]/approve/route");
const reject = await import("@/app/api/v1/admin/bookings/[id]/reject/route");
const hotels = await import("@/app/api/v1/hotels/route");
const csv = await import("@/app/api/v1/admin/finance/transactions.csv/route");

beforeEach(async () => {
  await resetDb();
  as(null);
});
afterAll(() => pool.end());

describe("route handlers", () => {
  it("public list returns the Page envelope", async () => {
    await createHotel({ name: "Open House" });
    const res = await callRoute(hotels.GET, { path: "/api/v1/hotels?limit=5" });
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ statusCode: 200, data: { items: [{ name: "Open House" }], pagination: { limit: 5, totalDocs: 1 } } });
  });

  it("maps validation errors to 400 with the field name", async () => {
    const res = await callRoute(hotels.GET, { path: "/api/v1/hotels?checkIn=2026-01-01" });
    expect(res.status).toBe(400);
    expect(res.json?.message).toMatch(/^checkOut:/);
  });

  it("requires a session (401) and the right role (403)", async () => {
    const h = await createHotel();
    const checkIn = addDays(today(), 10);
    const body = { hotelId: h.id, checkIn, checkOut: addDays(checkIn, 2), guests: 1 };

    expect((await callRoute(bookings.POST, { method: "POST", body })).status).toBe(401);

    as(await createUser("admin"));
    expect((await callRoute(bookings.POST, { method: "POST", body })).status).toBe(403);

    as(await createUser());
    expect((await callRoute(adminBookings.GET, { path: "/api/v1/admin/bookings" })).status).toBe(403);
    expect((await callRoute(csv.GET, { path: "/api/v1/admin/finance/transactions.csv" })).status).toBe(403);
  });

  it("creates a booking (201) and rejects bad input (400)", async () => {
    as(await createUser());
    const h = await createHotel({ rooms: 5 });
    const checkIn = addDays(today(), 10);
    const body = { hotelId: h.id, checkIn, checkOut: addDays(checkIn, 2), guests: 2 };

    const created = await callRoute(bookings.POST, { method: "POST", body });
    expect(created.status).toBe(201);
    expect(created.json?.message).toMatch(/^Request sent\. Ref HB-\d+\.$/);
    expect((await callRoute(bookings.POST, { method: "POST", body })).status).toBe(409);
    expect((await callRoute(bookings.POST, { method: "POST", body: { ...body, checkOut: checkIn } })).status).toBe(400);
    expect((await callRoute(bookings.POST, { method: "POST", body: { ...body, guests: 5 } })).status).toBe(400);
  });

  it("validates params and hides other users' bookings", async () => {
    const owner = await createUser();
    const h = await createHotel();
    const b = await insertBooking({ userId: owner.id, hotelId: h.id });

    as(await createUser());
    expect((await callRoute(bookingByRef.GET, { params: { ref: "nope" } })).status).toBe(400);
    expect((await callRoute(bookingByRef.GET, { params: { ref: b.ref } })).status).toBe(404);
  });

  it("admin approve and reject return messages; reject needs a reason", async () => {
    const guest = await createUser();
    const h = await createHotel({ rooms: 2 });
    const a = await insertBooking({ userId: guest.id, hotelId: h.id });
    const b = await insertBooking({ userId: guest.id, hotelId: h.id, checkIn: addDays(today(), 20) });

    as(await createUser("admin"));
    const approved = await callRoute(approve.POST, { method: "POST", params: { id: a.id } });
    expect(approved).toMatchObject({ status: 200, json: { message: `${a.ref} approved. Payment recorded.` } });
    expect((await callRoute(approve.POST, { method: "POST", params: { id: a.id } })).status).toBe(409);

    expect((await callRoute(reject.POST, { method: "POST", params: { id: b.id }, body: { reason: "no" } })).status).toBe(400);
    expect((await callRoute(reject.POST, { method: "POST", params: { id: b.id }, body: { reason: "Fully booked." } })).status).toBe(200);
  });

  it("CSV download is a file, not an envelope", async () => {
    as(await createUser("admin"));
    const res = await callRoute(csv.GET, { path: "/api/v1/admin/finance/transactions.csv" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="stayly-transactions-\d{4}-\d{2}-to-\d{4}-\d{2}\.csv"/);
    expect(res.text.split("\n")[0]).toBe("date,ref,guest_name,guest_email,hotel,type,amount_usd");
  });
});
