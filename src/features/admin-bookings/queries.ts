import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { AdminBookingPage, AdminBookingsQuery, BookingCounts } from "@/features/bookings";
import { adminBookingApi } from "./api/admin-booking.api";

export const adminBookingKeys = {
  all: ["admin-bookings"] as const,
  lists: () => [...adminBookingKeys.all, "list"] as const,
  list: (params: AdminBookingsQuery) => [...adminBookingKeys.lists(), params] as const,
  counts: () => [...adminBookingKeys.all, "counts"] as const,
};

type Fetch<P, T> = (params: P) => Promise<T>;

export const adminBookingQueries = {
  list: (params: AdminBookingsQuery, fetcher: Fetch<AdminBookingsQuery, AdminBookingPage> = adminBookingApi.list) =>
    queryOptions({ queryKey: adminBookingKeys.list(params), queryFn: () => fetcher(params), placeholderData: keepPreviousData }),
  counts: (fetcher: Fetch<void, BookingCounts> = adminBookingApi.counts) =>
    queryOptions({ queryKey: adminBookingKeys.counts(), queryFn: () => fetcher() }),
};
