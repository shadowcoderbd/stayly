import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MAX_UPLOAD_MB } from "@/lib/domain/hotel";
import { serverEnv } from "@/server/config/env";
import { BadRequestError } from "./errors";

export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const MAX_EDGE = 2000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

/** Storage interface so the local volume can be swapped for S3/MinIO later. */
export type Storage = {
  /** Validates, re-encodes to webp and stores an image. Returns its storage path (e.g. "hotels/abc.webp"). */
  putImage(input: Buffer, folder: string): Promise<string>;
  read(storagePath: string): Promise<Buffer>;
  remove(storagePath: string): Promise<void>;
};

const root = path.resolve(serverEnv.UPLOAD_DIR);

function resolveSafe(storagePath: string) {
  const full = path.resolve(root, storagePath);
  if (!full.startsWith(root + path.sep)) throw new BadRequestError("Invalid path.");
  return full;
}

export const localStorage: Storage = {
  async putImage(input, folder) {
    if (input.byteLength > MAX_UPLOAD_BYTES) throw new BadRequestError(`Images must be ${MAX_UPLOAD_MB} MB or smaller.`);
    // sharp reads the real format from the file's bytes, not its name or claimed MIME type.
    const meta = await sharp(input)
      .metadata()
      .catch(() => null);
    if (!meta?.format || !ALLOWED_FORMATS.has(meta.format)) throw new BadRequestError("Upload a JPG, PNG or WebP image.");

    const output = await sharp(input)
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const storagePath = `${folder}/${crypto.randomUUID()}.webp`;
    const full = resolveSafe(storagePath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, output);
    return storagePath;
  },
  read: (storagePath) => readFile(resolveSafe(storagePath)),
  async remove(storagePath) {
    await unlink(resolveSafe(storagePath)).catch(() => undefined);
  },
};

export const storage: Storage = localStorage;

/** Public URL for a stored file (served by app/api/uploads/[...path], outside /v1 like other static assets). */
export const publicUrl = (storagePath: string) => `/api/uploads/${storagePath}`;
