import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import type { AdminBookingsQuery } from "@/features/bookings";
import { adminBookingQueries } from "../queries";
import { adminBookingParsers, toAdminBookingsQuery } from "../search-params";

export function useAdminBookings() {
  const [params, setParams] = useQueryStates(adminBookingParsers, { scroll: false });
  const query = toAdminBookingsQuery(params);
  const { data, isPending, isFetching } = useQuery(adminBookingQueries.list(query));
  const { data: counts } = useQuery(adminBookingQueries.counts());

  return {
    bookings: data?.items ?? [],
    pagination: data?.pagination,
    counts,
    params,
    isLoading: isPending,
    isFetching,
    setStatus: (status: AdminBookingsQuery["status"]) => setParams({ status, page: 1 }),
    setHotel: (hotelId: string) => setParams({ hotelId, page: 1 }),
    setSearch: (search: string) => setParams({ search, page: 1 }),
    setPage: (page: number) => setParams({ page }),
  };
}
