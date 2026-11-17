import { apiHandler, parse } from "@/server/lib/api-handler";
import { ok } from "@/server/lib/response";
import { hotelIdSchema, imageIdSchema } from "@/server/modules/hotel/hotel.schema";
import * as hotelAdminService from "@/server/modules/hotel/hotel-admin.service";

export const DELETE = apiHandler<{ id: string; imageId: string }, "admin">("admin", async ({ params, actor }) => {
  const id = parse(hotelIdSchema, params.id);
  const imageId = parse(imageIdSchema, params.imageId);
  return ok(await hotelAdminService.removeImage(actor, id, imageId), "Photo removed.");
});
