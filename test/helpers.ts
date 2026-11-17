import { eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { auth } from "@/server/lib/better-auth";
import type { Actor } from "@/server/lib/auth";
import { addDays, today } from "@/server/lib/dates";
import { db } from "@/server/db/client";
import { booking, hotel, hotelImage, user } from "@/server/db/schema";

export async function resetDb() {
  await db.execute(
    sql`truncate table "transaction", review, booking, hotel_image, hotel, destination, session, account, verification, "user" restart identity cascade`,
  );
}

let n = 0;

/** Creates a user through Better Auth and returns them as a service actor. */
export async function createUser(role: "user" | "admin" = "user"): Promise<Actor> {
  const email = `u${++n}-${Date.now()}@test.local`;
  const created = await auth.api.signUpEmail({ body: { name: `User ${n}`, email, password: "password123" } });
  if (role === "admin") await db.update(user).set({ role }).where(eq(user.id, created.user.id));
  const [row] = await db.select().from(user).where(eq(user.id, created.user.id));
  return row as Actor;
}

export async function createHotel(overrides: Partial<typeof hotel.$inferInsert> = {}) {
  const [h] = await db
    .insert(hotel)
    .values({
      slug: `hotel-${++n}`,
      name: `Hotel ${n}`,
      city: "Lisbon",
      country: "Portugal",
      rooms: 1,
      nightlyRateCents: 10_000,
      status: "published",
      ...overrides,
    })
    .returning();
  await db.insert(hotelImage).values({ hotelId: h!.id, path: "hotels/x.webp", alt: "x" });
  return h!;
}

export async function insertBooking(values: Partial<typeof booking.$inferInsert> & { userId: string; hotelId: string }) {
  const checkIn = values.checkIn ?? addDays(today(), 10);
  const checkOut = values.checkOut ?? addDays(checkIn, 2);
  const [b] = await db
    .insert(booking)
    .values({
      checkIn,
      checkOut,
      nights: 2,
      guests: 2,
      nightlyRateCents: 10_000,
      subtotalCents: 20_000,
      taxCents: 2_400,
      totalCents: 22_400,
      ...values,
    })
    .returning();
  return b!;
}

/** Expects a promise to reject with an AppError of the given status. */
export async function expectStatus(promise: Promise<unknown>, statusCode: number) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  if (!error || (error as { statusCode?: number }).statusCode !== statusCode)
    throw new Error(`Expected AppError ${statusCode}, got ${error ? String((error as Error).message) : "success"}`);
}

type Handler<P> = (req: NextRequest, ctx: { params: Promise<P> }) => Promise<Response>;

/** Calls an exported route handler (GET/POST/…) the way Next.js does. */
export async function callRoute<P = Record<string, never>>(
  handler: Handler<P>,
  opts: { method?: string; path?: string; params?: P; body?: unknown } = {},
) {
  const req = new NextRequest(new URL(opts.path ?? "/", "http://localhost:3000"), {
    method: opts.method ?? "GET",
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body), headers: { "Content-Type": "application/json" } } : {}),
  });
  const res = await handler(req, { params: Promise.resolve((opts.params ?? {}) as P) });
  const text = await res.text();
  let json: { message: string; statusCode: number; data?: unknown } | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON (CSV)
  }
  return { status: res.status, json, text, headers: res.headers };
}

export { addDays, today };
