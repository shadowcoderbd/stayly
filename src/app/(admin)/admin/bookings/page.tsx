import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/Page";
import { AdminBookings, adminBookingQueries, loadAdminBookingParams, toAdminBookingsQuery } from "@/features/admin-bookings";
import * as hotelAdminService from "@/server/modules/hotel/hotel-admin.service";
import * as bookingService from "@/server/modules/booking/booking.service";
import { getServerQueryClient } from "@/lib/query/server";

export const metadata: Metadata = { title: "Booking requests · Admin" };

export default async function AdminBookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const query = toAdminBookingsQuery(await loadAdminBookingParams(searchParams));
  const queryClient = getServerQueryClient();

  const [hotels] = await Promise.all([
    hotelAdminService.options(), // read-only: passed as props
    queryClient.prefetchQuery(adminBookingQueries.list(query, bookingService.listForAdmin)),
    queryClient.prefetchQuery(adminBookingQueries.counts(bookingService.countsForAdmin)),
  ]);

  return (
    <PageContainer>
      <PageHeader title="Booking requests" description="Approve or reject what customers have requested." />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminBookings hotels={hotels} />
      </HydrationBoundary>
    </PageContainer>
  );
}
