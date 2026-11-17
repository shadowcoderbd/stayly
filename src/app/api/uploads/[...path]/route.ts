import { apiHandler } from "@/server/lib/api-handler";
import { NotFoundError } from "@/server/lib/errors";
import { storage } from "@/server/lib/storage";

/** Serves stored images. Paths are resolved safely inside UPLOAD_DIR by the storage layer. */
export const GET = apiHandler<{ path: string[] }>("public", async ({ params }) => {
  const file = await storage.read(params.path.join("/")).catch(() => {
    throw new NotFoundError();
  });
  return new Response(new Uint8Array(file), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
  });
});
