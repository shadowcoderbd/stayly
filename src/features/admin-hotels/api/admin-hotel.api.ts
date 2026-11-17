import type { HotelDetail, HotelImageData } from "@/features/hotels";
import { http } from "@/lib/http/client";
import { buildQueryString } from "@/lib/query-string";
import type { ApiResponse } from "@/types/api";
import type { AdminHotelPage, AdminHotelsQuery, HotelInput, HotelPatch } from "@/server/modules/hotel/hotel.types";

const unwrap = <T>(r: { data: ApiResponse<T> }) => r.data.data;

export const adminHotelApi = {
  list: (params: AdminHotelsQuery) => http.get<ApiResponse<AdminHotelPage>>(`/admin/hotels${buildQueryString(params)}`).then(unwrap),
  get: (id: string) => http.get<ApiResponse<HotelDetail>>(`/admin/hotels/${id}`).then(unwrap),
  create: (input: HotelInput) => http.post<ApiResponse<HotelDetail>>("/admin/hotels", input).then((r) => r.data),
  update: (id: string, input: HotelPatch) => http.patch<ApiResponse<HotelDetail>>(`/admin/hotels/${id}`, input).then((r) => r.data),

  uploadImages: (id: string, files: { file: File; alt: string }[]) => {
    const form = new FormData();
    for (const f of files) {
      form.append("files", f.file);
      form.append("alt", f.alt);
    }
    return http.post<ApiResponse<HotelImageData[]>>(`/admin/hotels/${id}/images`, form).then((r) => r.data);
  },
  arrangeImages: (id: string, images: { id: string; alt: string }[]) =>
    http.patch<ApiResponse<HotelImageData[]>>(`/admin/hotels/${id}/images`, { images }).then((r) => r.data),
  removeImage: (id: string, imageId: string) =>
    http.delete<ApiResponse<HotelImageData[]>>(`/admin/hotels/${id}/images/${imageId}`).then((r) => r.data),
};
