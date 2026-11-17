import { apiHandler, parseQuery } from "@/server/lib/api-handler";
import { ok } from "@/server/lib/response";
import { adminBookingsQuerySchema } from "@/server/modules/booking/booking.schema";
import * as bookingService from "@/server/modules/booking/booking.service";

export const GET = apiHandler("admin", async ({ req }) => ok(await bookingService.listForAdmin(parseQuery(req, adminBookingsQuerySchema))));
