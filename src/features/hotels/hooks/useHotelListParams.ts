import { useQueryStates } from "nuqs";
import { hotelListParsers, type HotelListParams } from "../search-params";

type Filters = Partial<Omit<HotelListParams, "page">>;

export function useHotelListParams() {
  const [params, setParams] = useQueryStates(hotelListParsers, { scroll: false });

  return {
    params,
    setPage: (page: number) => setParams({ page }),
    setFilter: (filters: Filters) => setParams({ ...filters, page: 1 }),
    clearFilters: () => setParams({ q: "", location: "", page: 1 }),
  };
}
