import { createLoader, parseAsInteger, parseAsString, parseAsStringLiteral, type inferParserType } from "nuqs/server";
import { ADMIN_BOOKING_TABS, type AdminBookingsQuery } from "@/features/bookings";

/** Request queue tabs, filters and paging (spec F-12). */
export const adminBookingParsers = {
  status: parseAsStringLiteral(ADMIN_BOOKING_TABS).withDefault("pending"),
  hotelId: parseAsString.withDefault(""),
  search: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};

export const loadAdminBookingParams = createLoader(adminBookingParsers);
export type AdminBookingParams = inferParserType<typeof adminBookingParsers>;
export const ADMIN_BOOKINGS_PER_PAGE = 20;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const toAdminBookingsQuery = (p: AdminBookingParams): AdminBookingsQuery => ({
  status: p.status,
  hotelId: UUID.test(p.hotelId) ? p.hotelId : "",
  search: p.search.trim().slice(0, 80),
  page: Math.max(1, p.page),
  limit: ADMIN_BOOKINGS_PER_PAGE,
});
