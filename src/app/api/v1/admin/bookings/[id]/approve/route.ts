import { apiHandler, parse } from "@/server/lib/api-handler";
import { ok } from "@/server/lib/response";
import { bookingIdSchema } from "@/server/modules/booking/booking.schema";
import * as bookingService from "@/server/modules/booking/booking.service";

export const POST = apiHandler<{ id: string }, "admin">("admin", async ({ params, actor }) => {
  const result = await bookingService.approve(actor, parse(bookingIdSchema, params.id));
  return ok(result, `${result.ref} approved. Payment recorded.`);
});
