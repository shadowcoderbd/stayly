import { createLoader, parseAsInteger, parseAsString, parseAsStringLiteral, type inferParserType } from "nuqs/server";
import { BOOKING_TABS } from "@/lib/domain/booking";
import type { MyBookingsQuery } from "@/server/modules/booking/booking.types";

/** My bookings tabs + paging (spec F-06). */
export const myBookingParsers = {
  status: parseAsStringLiteral(BOOKING_TABS).withDefault("all"),
  page: parseAsInteger.withDefault(1),
};

export const loadMyBookingParams = createLoader(myBookingParsers);
export type MyBookingParams = inferParserType<typeof myBookingParsers>;
export const BOOKINGS_PER_PAGE = 10;

/** The exact query sent to the server (and the query key). */
export const toMyBookingsQuery = (p: MyBookingParams): MyBookingsQuery => ({
  status: p.status,
  page: Math.max(1, p.page),
  limit: BOOKINGS_PER_PAGE,
});

/** The booking panel's stay, kept in the URL so it survives the sign-in round trip (spec F-05). */
export const stayParsers = {
  checkIn: parseAsString.withDefault(""),
  checkOut: parseAsString.withDefault(""),
  guests: parseAsInteger.withDefault(2),
};
