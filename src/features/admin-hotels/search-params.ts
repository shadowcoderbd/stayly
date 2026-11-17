import { createLoader, parseAsInteger, parseAsString, parseAsStringLiteral, type inferParserType } from "nuqs/server";
import { HOTEL_STATUS_TABS } from "@/lib/domain/hotel";
import type { AdminHotelsQuery } from "@/server/modules/hotel/hotel.types";

/** Admin hotel list filters and the side panel's `?edit=<id>` (spec F-10 / F-11). */
export const adminHotelParsers = {
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(HOTEL_STATUS_TABS).withDefault("all"),
  page: parseAsInteger.withDefault(1),
  edit: parseAsString.withDefault(""),
};

export const loadAdminHotelParams = createLoader(adminHotelParsers);
export type AdminHotelParams = inferParserType<typeof adminHotelParsers>;
export const ADMIN_HOTELS_PER_PAGE = 20;

export const toAdminHotelsQuery = (p: AdminHotelParams): AdminHotelsQuery => ({
  q: p.q.trim().slice(0, 80),
  status: p.status,
  page: Math.max(1, p.page),
  limit: ADMIN_HOTELS_PER_PAGE,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isHotelId = (v: string) => UUID.test(v);
