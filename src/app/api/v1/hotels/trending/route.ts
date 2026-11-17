import { apiHandler, parseQuery } from "@/server/lib/api-handler";
import { ok } from "@/server/lib/response";
import { limitQuerySchema } from "@/server/modules/hotel/hotel.schema";
import * as hotelService from "@/server/modules/hotel/hotel.service";

export const GET = apiHandler("public", async ({ req }) => {
  const { limit } = parseQuery(req, limitQuerySchema(5));
  return ok(await hotelService.trending(limit));
});
