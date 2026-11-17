import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { adminHotelQueries } from "../queries";
import type { AdminHotelsQuery } from "@/server/modules/hotel/hotel.types";
import { adminHotelParsers, isHotelId, toAdminHotelsQuery } from "../search-params";

export function useAdminHotelParams() {
  const [params, setParams] = useQueryStates(adminHotelParsers, { scroll: false });
  return {
    params,
    editId: isHotelId(params.edit) ? params.edit : null,
    setPage: (page: number) => setParams({ page }),
    setSearch: (q: string) => setParams({ q, page: 1 }),
    setStatus: (status: AdminHotelsQuery["status"]) => setParams({ status, page: 1 }),
    startEdit: (id: string) => setParams({ edit: id }),
    startNew: () => setParams({ edit: "" }),
  };
}

export function useAdminHotels() {
  const list = useAdminHotelParams();
  const { data, isPending, isFetching } = useQuery(adminHotelQueries.list(toAdminHotelsQuery(list.params)));
  return { hotels: data?.items ?? [], pagination: data?.pagination, isLoading: isPending, isFetching, ...list };
}

export function useAdminHotel(id: string | null) {
  const { data, isPending, isError } = useQuery({ ...adminHotelQueries.detail(id ?? ""), enabled: !!id });
  return { hotel: id ? data : undefined, isLoading: !!id && isPending, isError };
}
