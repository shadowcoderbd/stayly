import "server-only";
import { MAX_IMAGES } from "@/lib/domain/hotel";
import { serverEnv } from "@/server/config/env";
import { db } from "@/server/db/client";
import type { Actor } from "@/server/lib/auth";
import { today } from "@/server/lib/dates";
import { BadRequestError, ConflictError, NotFoundError } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { storage } from "@/server/lib/storage";
import { toPage } from "@/types/api";
import * as hotelRepo from "./hotel.repository";
import type { AdminHotelPage, AdminHotelsQuery, HotelDetail, HotelImage, HotelInput, HotelOption, HotelPatch } from "./hotel.types";

// Hotel management for admins (spec F-11).

export function slugify(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "hotel"
  );
}

async function uniqueSlug(name: string) {
  const base = slugify(name);
  const taken = new Set(await hotelRepo.slugsLike(base));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

/** Trims and de-duplicates case-insensitively, keeping the first spelling. */
function cleanAmenities(list: string[]) {
  const seen = new Map<string, string>();
  for (const a of list.map((x) => x.trim()).filter(Boolean)) if (!seen.has(a.toLowerCase())) seen.set(a.toLowerCase(), a);
  return [...seen.values()];
}

const needsImage = () => new ConflictError("Add at least one photo before publishing this hotel.");

async function assertExists(id: string) {
  const current = await hotelRepo.findById(id);
  if (!current) throw new NotFoundError("Hotel not found.");
  return current;
}

export async function list(p: AdminHotelsQuery): Promise<AdminHotelPage> {
  const { items, total } = await hotelRepo.listAll(p);
  return toPage(items, { page: p.page, limit: p.limit, totalDocs: total });
}

/** Any hotel, including hidden ones. */
export async function get(id: string): Promise<HotelDetail> {
  const detail = await hotelRepo.findDetail({ id }, { includeHidden: true });
  if (!detail) throw new NotFoundError("Hotel not found.");
  return { ...detail, taxRate: serverEnv.TAX_RATE };
}

export async function create(actor: Actor, input: HotelInput): Promise<HotelDetail> {
  // A new hotel has no photos yet, so it can't be published in the same call.
  if (input.status === "published") throw needsImage();
  const id = await hotelRepo.insert({ ...input, amenities: cleanAmenities(input.amenities), slug: await uniqueSlug(input.name) });
  logger.info({ event: "hotel.created", hotelId: id, actor: actor.id });
  return get(id);
}

export async function update(actor: Actor, id: string, input: HotelPatch): Promise<HotelDetail> {
  const current = await assertExists(id);

  if (input.rooms !== undefined && input.rooms < current.rooms) {
    const peak = await hotelRepo.peakFutureOccupancy(db, id, today());
    if (peak && peak.count > input.rooms)
      throw new ConflictError(`${peak.count} rooms are already booked on ${peak.day}. Rooms can't go below that.`);
  }
  if (input.status === "published" && (await hotelRepo.countImages(id)) === 0) throw needsImage();

  await hotelRepo.update(id, { ...input, ...(input.amenities ? { amenities: cleanAmenities(input.amenities) } : {}) });
  logger.info({ event: "hotel.updated", hotelId: id, actor: actor.id, fields: Object.keys(input) });
  return get(id);
}

export async function addImages(actor: Actor, hotelId: string, files: { data: Buffer; alt: string }[]): Promise<HotelImage[]> {
  if (files.length === 0) throw new BadRequestError("Choose at least one photo.");
  await assertExists(hotelId);
  if ((await hotelRepo.countImages(hotelId)) + files.length > MAX_IMAGES)
    throw new BadRequestError(`A hotel can have at most ${MAX_IMAGES} photos.`);

  let position = await hotelRepo.nextImagePosition(hotelId);
  for (const f of files) {
    const path = await storage.putImage(f.data, `hotels/${hotelId}`);
    await hotelRepo.insertImage({ hotelId, path, alt: f.alt, position: position++ });
  }
  logger.info({ event: "hotel.images.added", hotelId, actor: actor.id, count: files.length });
  return hotelRepo.listImages(db, hotelId);
}

/** Reorders (array order = position; first = cover) and updates alt text. */
export async function arrangeImages(actor: Actor, hotelId: string, images: { id: string; alt: string }[]): Promise<HotelImage[]> {
  const current = await hotelRepo.listImages(db, hotelId);
  const ids = new Set(current.map((i) => i.id));
  if (images.length !== current.length || new Set(images.map((i) => i.id)).size !== images.length || !images.every((i) => ids.has(i.id)))
    throw new BadRequestError("Send every photo of this hotel exactly once.");
  await hotelRepo.arrangeImages(hotelId, images);
  logger.info({ event: "hotel.images.arranged", hotelId, actor: actor.id });
  return hotelRepo.listImages(db, hotelId);
}

export async function removeImage(actor: Actor, hotelId: string, imageId: string): Promise<HotelImage[]> {
  const h = await assertExists(hotelId);
  const img = await hotelRepo.findImage(hotelId, imageId);
  if (!img) throw new NotFoundError("Photo not found.");
  if (h.status === "published" && (await hotelRepo.countImages(hotelId)) <= 1)
    throw new ConflictError("A published hotel needs at least one photo. Hide it first or add another photo.");
  await hotelRepo.deleteImage(imageId);
  await storage.remove(img.path);
  logger.info({ event: "hotel.images.removed", hotelId, actor: actor.id, imageId });
  return hotelRepo.listImages(db, hotelId);
}

/** Every hotel as `{ id, name }`, for filter selects. */
export const options = (): Promise<HotelOption[]> => hotelRepo.options();
