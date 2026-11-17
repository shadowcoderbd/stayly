import { apiHandler, parse, parseQuery } from "@/server/lib/api-handler";
import { ok } from "@/server/lib/response";
import { availabilityQuerySchema, hotelIdSchema } from "@/server/modules/hotel/hotel.schema";
import * as hotelService from "@/server/modules/hotel/hotel.service";

// The segment is named [slug] to share the level with /hotels/[slug]; here it carries the hotel id.
export const GET = apiHandler<{ slug: string }>("public", async ({ req, params }) => {
  const id = parse(hotelIdSchema, params.slug);
  const { checkIn, checkOut } = parseQuery(req, availabilityQuerySchema);
  return ok(await hotelService.availability(id, checkIn, checkOut));
});
