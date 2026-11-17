import type { AdminBookingPage, AdminBookingsQuery, BookingCounts, BookingDecision } from "@/features/bookings";
import { http } from "@/lib/http/client";
import { buildQueryString } from "@/lib/query-string";
import type { ApiResponse } from "@/types/api";

const unwrap = <T>(r: { data: ApiResponse<T> }) => r.data.data;

export const adminBookingApi = {
  list: (params: AdminBookingsQuery) => http.get<ApiResponse<AdminBookingPage>>(`/admin/bookings${buildQueryString(params)}`).then(unwrap),
  counts: () => http.get<ApiResponse<BookingCounts>>("/admin/bookings/counts").then(unwrap),
  approve: (id: string) => http.post<ApiResponse<BookingDecision>>(`/admin/bookings/${id}/approve`).then((r) => r.data),
  reject: ({ id, reason }: { id: string; reason: string }) =>
    http.post<ApiResponse<BookingDecision>>(`/admin/bookings/${id}/reject`, { reason }).then((r) => r.data),
};
