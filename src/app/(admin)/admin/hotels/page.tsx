import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/Page";
import { AdminHotels, adminHotelQueries, isHotelId, loadAdminHotelParams, toAdminHotelsQuery } from "@/features/admin-hotels";
import * as hotelAdminService from "@/server/modules/hotel/hotel-admin.service";
import { getServerQueryClient } from "@/lib/query/server";

export const metadata: Metadata = { title: "Hotels · Admin" };

export default async function AdminHotelsPage({ searchParams }: PageProps<"/admin/hotels">) {
  const params = await loadAdminHotelParams(searchParams);
  const queryClient = getServerQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(adminHotelQueries.list(toAdminHotelsQuery(params), hotelAdminService.list)),
    isHotelId(params.edit) && queryClient.prefetchQuery(adminHotelQueries.detail(params.edit, hotelAdminService.get)),
  ]);

  return (
    <PageContainer>
      <PageHeader title="Hotels" description="Create and manage the hotels customers can book." />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminHotels />
      </HydrationBoundary>
    </PageContainer>
  );
}
