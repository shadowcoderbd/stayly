import { apiHandler, parse, parseBody } from "@/server/lib/api-handler";
import { ok } from "@/server/lib/response";
import { hotelIdSchema, hotelPatchSchema } from "@/server/modules/hotel/hotel.schema";
import * as hotelAdminService from "@/server/modules/hotel/hotel-admin.service";

export const GET = apiHandler<{ id: string }, "admin">("admin", async ({ params }) => {
  return ok(await hotelAdminService.get(parse(hotelIdSchema, params.id)));
});

export const PATCH = apiHandler<{ id: string }, "admin">("admin", async ({ req, params, actor }) => {
  const id = parse(hotelIdSchema, params.id);
  const input = await parseBody(req, hotelPatchSchema);
  const message = input.status === "published" ? "Hotel published." : input.status === "hidden" ? "Hotel hidden." : "Hotel saved.";
  return ok(await hotelAdminService.update(actor, id, input), message);
});
