import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { HotelDetail } from "@/features/hotels";
import { adminHotelApi } from "./api/admin-hotel.api";
import type { AdminHotelPage, AdminHotelsQuery } from "@/server/modules/hotel/hotel.types";

export const adminHotelKeys = {
  all: ["admin-hotels"] as const,
  lists: () => [...adminHotelKeys.all, "list"] as const,
  list: (params: AdminHotelsQuery) => [...adminHotelKeys.lists(), params] as const,
  details: () => [...adminHotelKeys.all, "detail"] as const,
  detail: (id: string) => [...adminHotelKeys.details(), id] as const,
};

type Fetch<P, T> = (params: P) => Promise<T>;

export const adminHotelQueries = {
  list: (params: AdminHotelsQuery, fetcher: Fetch<AdminHotelsQuery, AdminHotelPage> = adminHotelApi.list) =>
    queryOptions({
      queryKey: adminHotelKeys.list(params),
      queryFn: () => fetcher(params),
      placeholderData: keepPreviousData,
    }),

  detail: (id: string, fetcher: Fetch<string, HotelDetail> = adminHotelApi.get) =>
    queryOptions({
      queryKey: adminHotelKeys.detail(id),
      queryFn: () => fetcher(id),
    }),
};
