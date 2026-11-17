import { http } from "@/lib/http/client";
import { buildQueryString } from "@/lib/query-string";
import type { ApiResponse } from "@/types/api";
import type {
  BookingCounts,
  BookingPage,
  CancelResult,
  CreateBookingInput,
  CreatedBooking,
  MyBookingsQuery,
} from "@/server/modules/booking/booking.types";

const unwrap = <T>(r: { data: ApiResponse<T> }) => r.data.data;

/** Browser fetchers for /api/v1/bookings/*. Mutations return the envelope so hooks can toast its message. */
export const bookingApi = {
  create: (input: CreateBookingInput) => http.post<ApiResponse<CreatedBooking>>("/bookings", input).then((r) => r.data),
  listMine: (params: MyBookingsQuery) => http.get<ApiResponse<BookingPage>>(`/bookings${buildQueryString(params)}`).then(unwrap),
  countsMine: () => http.get<ApiResponse<BookingCounts>>("/bookings/counts").then(unwrap),
  cancel: (ref: string) =>
    http.post<ApiResponse<CancelResult>>(`/bookings/${encodeURIComponent(ref)}/cancel`).then((r) => r.data),
};
