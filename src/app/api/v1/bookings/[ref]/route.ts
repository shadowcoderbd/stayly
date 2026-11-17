import { apiHandler, parse } from "@/server/lib/api-handler";
import { ok } from "@/server/lib/response";
import { bookingRefSchema } from "@/server/modules/booking/booking.schema";
import * as bookingService from "@/server/modules/booking/booking.service";

export const GET = apiHandler<{ ref: string }, "customer">("customer", async ({ params, actor }) => {
  return ok(await bookingService.getMine(actor, parse(bookingRefSchema, params.ref)));
});
