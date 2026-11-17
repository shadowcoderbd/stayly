import { createLoader, parseAsInteger, parseAsString, type inferParserType } from "nuqs/server";
import { isDay, MAX_NIGHTS, nightsBetween } from "@/lib/dates";
import type { HotelQuery } from "@/server/modules/hotel/hotel.types";

/** Browse filters (spec F-03). One definition for the server prefetch and the client hooks. */
export const hotelListParsers = {
  q: parseAsString.withDefault(""),
  location: parseAsString.withDefault(""),
  checkIn: parseAsString.withDefault(""),
  checkOut: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};

export const loadHotelListParams = createLoader(hotelListParsers);
export type HotelListParams = inferParserType<typeof hotelListParsers>;

export const HOTELS_PER_PAGE = 12;
export { MAX_NIGHTS };

/** A day before today in UTC: lenient enough for every time zone; the server has the final word. */
const earliestCheckIn = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

/** Why a date pair can't be searched, or null when it's fine (mirrors the server rules). */
export function stayError(checkIn: string, checkOut: string): string | null {
  if (!checkIn || !checkOut) return null;
  if (!isDay(checkIn) || !isDay(checkOut)) return "Pick valid dates.";
  if (checkOut <= checkIn) return "Check-out must be after check-in.";
  if (checkIn < earliestCheckIn()) return "Check-in can't be in the past.";
  if (nightsBetween(checkIn, checkOut) > MAX_NIGHTS) return `Stays are limited to ${MAX_NIGHTS} nights.`;
  return null;
}

/** The exact query sent to the server (and used as the query key). Dates only count as a valid pair. */
export function toHotelQuery(p: HotelListParams): HotelQuery {
  const hasDates = !!p.checkIn && !!p.checkOut && stayError(p.checkIn, p.checkOut) === null;
  return {
    q: p.q.trim().slice(0, 80),
    location: p.location,
    checkIn: hasDates ? p.checkIn : "",
    checkOut: hasDates ? p.checkOut : "",
    page: Math.max(1, p.page),
    limit: HOTELS_PER_PAGE,
  };
}

/** Carries chosen dates from browse to the hotel page and back (spec F-04/F-05). */
export function dateQuery(p: { checkIn?: string; checkOut?: string }) {
  return p.checkIn && p.checkOut ? `?checkIn=${p.checkIn}&checkOut=${p.checkOut}` : "";
}
