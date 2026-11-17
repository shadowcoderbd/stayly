import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { bookingApi } from "./api/booking.api";
import type { BookingCounts, BookingPage, MyBookingsQuery } from "@/server/modules/booking/booking.types";

export const bookingKeys = {
  all: ["bookings"] as const,
  lists: () => [...bookingKeys.all, "list"] as const,
  list: (params: MyBookingsQuery) => [...bookingKeys.lists(), params] as const,
  counts: () => [...bookingKeys.all, "counts"] as const,
};

type Fetch<P, T> = (params: P) => Promise<T>;

// `fetcher` defaults to the browser fetcher. Server Components pass the service (bound to the actor).
export const bookingQueries = {
  list: (params: MyBookingsQuery, fetcher: Fetch<MyBookingsQuery, BookingPage> = bookingApi.listMine) =>
    queryOptions({
      queryKey: bookingKeys.list(params),
      queryFn: () => fetcher(params),
      placeholderData: keepPreviousData,
    }),

  counts: (fetcher: Fetch<void, BookingCounts> = bookingApi.countsMine) =>
    queryOptions({
      queryKey: bookingKeys.counts(),
      queryFn: () => fetcher(),
    }),
};
