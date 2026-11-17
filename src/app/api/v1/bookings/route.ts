import { apiHandler, parseBody, parseQuery } from "@/server/lib/api-handler";
import { createRateLimiter } from "@/server/lib/rate-limit";
import { created, ok } from "@/server/lib/response";
import { createBookingSchema, myBookingsQuerySchema } from "@/server/modules/booking/booking.schema";
import * as bookingService from "@/server/modules/booking/booking.service";

const limitCreate = createRateLimiter({ max: 10, windowMs: 60_000 });

/** GET /api/v1/bookings: the caller's bookings. */
export const GET = apiHandler("customer", async ({ req, actor }) => {
  return ok(await bookingService.listMine(actor, parseQuery(req, myBookingsQuerySchema)));
});

/** POST /api/v1/bookings: request a booking. */
export const POST = apiHandler("customer", async ({ req, actor }) => {
  limitCreate(actor.id);
  const booking = await bookingService.create(actor, await parseBody(req, createBookingSchema));
  return created(booking, `Request sent. Ref ${booking.ref}.`);
});
