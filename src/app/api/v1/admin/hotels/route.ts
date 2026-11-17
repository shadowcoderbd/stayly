import { apiHandler, parseBody, parseQuery } from "@/server/lib/api-handler";
import { created, ok } from "@/server/lib/response";
import { adminHotelsQuerySchema, hotelInputSchema } from "@/server/modules/hotel/hotel.schema";
import * as hotelAdminService from "@/server/modules/hotel/hotel-admin.service";

export const GET = apiHandler("admin", async ({ req }) => ok(await hotelAdminService.list(parseQuery(req, adminHotelsQuerySchema))));

export const POST = apiHandler("admin", async ({ req, actor }) => {
  return created(await hotelAdminService.create(actor, await parseBody(req, hotelInputSchema)), "Hotel created.");
});
