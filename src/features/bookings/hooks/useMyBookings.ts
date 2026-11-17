import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { bookingQueries } from "../queries";
import type { MyBookingsQuery } from "@/server/modules/booking/booking.types";
import { myBookingParsers, toMyBookingsQuery } from "../search-params";

export function useMyBookings() {
  const [params, setParams] = useQueryStates(myBookingParsers, { scroll: false });
  const { data, isPending, isFetching } = useQuery(bookingQueries.list(toMyBookingsQuery(params)));
  const { data: counts } = useQuery(bookingQueries.counts());

  return {
    bookings: data?.items ?? [],
    pagination: data?.pagination,
    counts,
    params,
    isLoading: isPending,
    isFetching,
    setStatus: (status: MyBookingsQuery["status"]) => setParams({ status, page: 1 }),
    setPage: (page: number) => setParams({ page }),
  };
}
