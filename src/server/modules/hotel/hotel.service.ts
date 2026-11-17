import "server-only";
import { serverEnv } from "@/server/config/env";
import { db } from "@/server/db/client";
import { today } from "@/server/lib/dates";
import { BadRequestError, NotFoundError } from "@/server/lib/errors";
import { toPage } from "@/types/api";
import * as hotelRepo from "./hotel.repository";
import type { Availability, Destination, HotelCard, HotelDetail, HotelPage, HotelQuery, Location, TrendingHotel } from "./hotel.types";

// Public catalog (spec F-03 / F-04). Admin management lives in hotel-admin.service.ts.

function assertNotPast(checkIn: string) {
  if (checkIn < today()) throw new BadRequestError("checkIn: Check-in can't be in the past.");
}

/** Browse / search. Dates filter to hotels with at least one room left. */
export async function search(p: HotelQuery): Promise<HotelPage> {
  const stay = p.checkIn && p.checkOut ? { checkIn: p.checkIn, checkOut: p.checkOut } : null;
  if (stay) assertNotPast(stay.checkIn);
  const { items, total } = await hotelRepo.search({ q: p.q, location: p.location, stay, page: p.page, limit: p.limit });
  return toPage(items, { page: p.page, limit: p.limit, totalDocs: total });
}

export const topRated = (limit = 4): Promise<HotelCard[]> => hotelRepo.topRated(limit);

/** Hotels with the most booking requests in the last 7 days (spec F-03 §5). */
export const trending = (limit = 5): Promise<TrendingHotel[]> => hotelRepo.mostRequestedThisWeek(limit);

/** Trending destinations: 30-day request growth per city, topped up with the biggest cities (spec F-03 §3). */
export async function destinations(limit = 6): Promise<Destination[]> {
  const all = (await hotelRepo.cityStats()).map<Destination>((c) => ({
    city: c.city,
    country: c.country,
    hotelCount: c.hotelCount,
    trendPct:
      c.requestsCur >= 3 ? (c.requestsPrev > 0 ? Math.round(((c.requestsCur - c.requestsPrev) / c.requestsPrev) * 100) : 100) : null,
    imageUrl: c.imageUrl,
  }));

  const trendingCities = all
    .filter((d) => d.trendPct !== null && d.trendPct > 0)
    .sort((a, b) => b.trendPct! - a.trendPct!)
    .slice(0, limit);
  const fill = all
    .filter((d) => !trendingCities.includes(d))
    .sort((a, b) => b.hotelCount - a.hotelCount || a.city.localeCompare(b.city))
    .slice(0, limit - trendingCities.length)
    .map((d) => ({ ...d, trendPct: null }));
  return [...trendingCities, ...fill];
}

export const locations = (): Promise<Location[]> => hotelRepo.locations();

/** For pages: null instead of a 404, so they can call notFound(). */
export async function findBySlug(slug: string): Promise<HotelDetail | null> {
  const detail = await hotelRepo.findDetail({ slug });
  return detail && { ...detail, taxRate: serverEnv.TAX_RATE };
}

export async function getBySlug(slug: string): Promise<HotelDetail> {
  const detail = await findBySlug(slug);
  if (!detail) throw new NotFoundError("Hotel not found.");
  return detail;
}

export async function availability(hotelId: string, checkIn: string, checkOut: string): Promise<Availability> {
  assertNotPast(checkIn);
  const h = await hotelRepo.findBookable(db, hotelId);
  if (!h) throw new NotFoundError("Hotel not found.");
  const roomsLeft = Math.max(0, await hotelRepo.roomsLeft(db, hotelId, h.rooms, checkIn, checkOut));
  return { available: roomsLeft > 0, roomsLeft };
}
