import { formatMoney } from "@/lib/format";
import { apiHandler, parse } from "@/server/lib/api-handler";
import { ok } from "@/server/lib/response";
import { bookingRefSchema } from "@/server/modules/booking/booking.schema";
import * as bookingService from "@/server/modules/booking/booking.service";

export const POST = apiHandler<{ ref: string }, "customer">("customer", async ({ params, actor }) => {
  const result = await bookingService.cancel(actor, parse(bookingRefSchema, params.ref));
  const message =
    result.refundCents > 0
      ? `Booking ${result.ref} cancelled. ${formatMoney(result.refundCents)} will be refunded.`
      : `Request ${result.ref} cancelled.`;
  return ok(result, message);
});
