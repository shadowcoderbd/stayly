import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
  AllHotels,
  dateQuery,
  HeroSearch,
  hotelQueries,
  loadHotelListParams,
  toHotelQuery,
  TopRated,
  TrendingDestinations,
  TrendingThisWeek,
} from "@/features/hotels";
import * as hotelService from "@/server/modules/hotel/hotel.service";
import { getServerQueryClient } from "@/lib/query/server";

export default async function BrowsePage({ searchParams }: PageProps<"/">) {
  const params = await loadHotelListParams(searchParams);
  const query = toHotelQuery(params);
  const queryClient = getServerQueryClient();

  // Read-only sections call the services directly; the filterable list is prefetched into the query cache.
  const [locations, destinations, topRated, trending] = await Promise.all([
    hotelService.locations().catch(() => []),
    hotelService.destinations().catch(() => []),
    hotelService.topRated(4).catch(() => []),
    hotelService.trending(5).catch(() => []),
    queryClient.prefetchQuery(hotelQueries.list(query, hotelService.search)),
  ]);
  const linkQuery = dateQuery(query);

  return (
    <>
      <HeroSearch locations={locations} />
      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-4 pt-14 pb-18 sm:px-6">
        <TrendingDestinations destinations={destinations} />
        <TopRated hotels={topRated} linkQuery={linkQuery} />
        <TrendingThisWeek hotels={trending} linkQuery={linkQuery} />
        <HydrationBoundary state={dehydrate(queryClient)}>
          <AllHotels />
        </HydrationBoundary>
      </main>
    </>
  );
}
