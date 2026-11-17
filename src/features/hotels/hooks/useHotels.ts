import { useQuery } from "@tanstack/react-query";
import { hotelQueries } from "../queries";
import { toHotelQuery } from "../search-params";
import { useHotelListParams } from "./useHotelListParams";

export function useHotels() {
  const list = useHotelListParams();
  const query = toHotelQuery(list.params);
  const { data, isPending, isFetching } = useQuery(hotelQueries.list(query));

  return {
    hotels: data?.items ?? [],
    pagination: data?.pagination,
    query,
    isLoading: isPending,
    isFetching,
    ...list,
  };
}
