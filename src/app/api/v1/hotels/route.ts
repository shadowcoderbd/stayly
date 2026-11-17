import { apiHandler, parseQuery } from "@/server/lib/api-handler";
import { ok } from "@/server/lib/response";
import { hotelListQuerySchema } from "@/server/modules/hotel/hotel.schema";
import * as hotelService from "@/server/modules/hotel/hotel.service";

/** GET /api/v1/hotels: browse and search published hotels. */
export const GET = apiHandler("public", async ({ req }) => ok(await hotelService.search(parseQuery(req, hotelListQuerySchema))));
