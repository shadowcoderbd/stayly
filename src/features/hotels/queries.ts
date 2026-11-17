import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { hotelApi } from "./api/hotel.api";
import type { Availability, HotelPage, HotelQuery } from "@/server/modules/hotel/hotel.types";

export const hotelKeys = {
  all: ["hotels"] as const,
  lists: () => [...hotelKeys.all, "list"] as const,
  list: (params: HotelQuery) => [...hotelKeys.lists(), params] as const,
  availability: (hotelId: string, checkIn: string, checkOut: string) =>
    [...hotelKeys.all, "availability", hotelId, checkIn, checkOut] as const,
};

type Fetch<P, T> = (params: P) => Promise<T>;

// `fetcher` defaults to the browser fetcher. Server Components pass the service: same key, same type.
export const hotelQueries = {
  list: (params: HotelQuery, fetcher: Fetch<HotelQuery, HotelPage> = hotelApi.search) =>
    queryOptions({
      queryKey: hotelKeys.list(params),
      queryFn: () => fetcher(params),
      placeholderData: keepPreviousData, // no flicker when filtering or paging
    }),

  availability: (hotelId: string, checkIn: string, checkOut: string) =>
    queryOptions<Availability>({
      queryKey: hotelKeys.availability(hotelId, checkIn, checkOut),
      queryFn: () => hotelApi.availability(hotelId, checkIn, checkOut),
      staleTime: 15_000,
      meta: { silent: true }, // the booking panel shows availability errors inline
    }),
};
