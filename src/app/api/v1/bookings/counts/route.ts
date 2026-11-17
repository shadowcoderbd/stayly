import { apiHandler } from "@/server/lib/api-handler";
import { ok } from "@/server/lib/response";
import * as bookingService from "@/server/modules/booking/booking.service";

export const GET = apiHandler("customer", async ({ actor }) => ok(await bookingService.countsMine(actor)));
