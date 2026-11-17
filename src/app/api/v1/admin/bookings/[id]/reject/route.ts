import { apiHandler, parse, parseBody } from "@/server/lib/api-handler";
import { ok } from "@/server/lib/response";
import { bookingIdSchema, rejectBookingSchema } from "@/server/modules/booking/booking.schema";
import * as bookingService from "@/server/modules/booking/booking.service";

export const POST = apiHandler<{ id: string }, "admin">("admin", async ({ req, params, actor }) => {
  const id = parse(bookingIdSchema, params.id);
  const { reason } = await parseBody(req, rejectBookingSchema);
  const result = await bookingService.reject(actor, id, reason);
  return ok(result, `${result.ref} rejected.`);
});
