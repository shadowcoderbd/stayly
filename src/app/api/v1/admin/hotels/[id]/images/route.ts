import { apiHandler, parse, parseBody, parseForm } from "@/server/lib/api-handler";
import { created, ok } from "@/server/lib/response";
import { arrangeImagesSchema, hotelIdSchema } from "@/server/modules/hotel/hotel.schema";
import * as hotelAdminService from "@/server/modules/hotel/hotel-admin.service";

/** multipart/form-data: one or more `files`, with an optional `alt` per file (same order). */
export const POST = apiHandler<{ id: string }, "admin">("admin", async ({ req, params, actor }) => {
  const id = parse(hotelIdSchema, params.id);
  const form = await parseForm(req);
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const alts = form.getAll("alt").map(String);
  const payload = await Promise.all(
    files.map(async (f, i) => ({ data: Buffer.from(await f.arrayBuffer()), alt: (alts[i] ?? "").trim().slice(0, 160) })),
  );
  const images = await hotelAdminService.addImages(actor, id, payload);
  return created(images, files.length === 1 ? "Photo added." : `${files.length} photos added.`);
});

export const PATCH = apiHandler<{ id: string }, "admin">("admin", async ({ req, params, actor }) => {
  const id = parse(hotelIdSchema, params.id);
  const { images } = await parseBody(req, arrangeImagesSchema);
  return ok(await hotelAdminService.arrangeImages(actor, id, images), "Photos updated.");
});
