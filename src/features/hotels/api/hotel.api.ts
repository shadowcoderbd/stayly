import { http } from "@/lib/http/client";
import { buildQueryString } from "@/lib/query-string";
import type { ApiResponse } from "@/types/api";
import type { Availability, Destination, HotelCard, HotelDetail, HotelPage, HotelQuery, Location, TrendingHotel } from "@/server/modules/hotel/hotel.types";

const unwrap = <T>(r: { data: ApiResponse<T> }) => r.data.data;

/** Browser fetchers for /api/v1/hotels/*. Each returns the same DTO as the matching service function. */
export const hotelApi = {
  search: (params: HotelQuery) => http.get<ApiResponse<HotelPage>>(`/hotels${buildQueryString(params)}`).then(unwrap),
  topRated: (limit = 4) => http.get<ApiResponse<HotelCard[]>>(`/hotels/top-rated${buildQueryString({ limit })}`).then(unwrap),
  trending: (limit = 5) => http.get<ApiResponse<TrendingHotel[]>>(`/hotels/trending${buildQueryString({ limit })}`).then(unwrap),
  destinations: () => http.get<ApiResponse<Destination[]>>("/destinations").then(unwrap),
  locations: () => http.get<ApiResponse<Location[]>>("/locations").then(unwrap),
  getBySlug: (slug: string) => http.get<ApiResponse<HotelDetail>>(`/hotels/${encodeURIComponent(slug)}`).then(unwrap),
  availability: (hotelId: string, checkIn: string, checkOut: string) =>
    http.get<ApiResponse<Availability>>(`/hotels/${hotelId}/availability${buildQueryString({ checkIn, checkOut })}`).then(unwrap),
};
