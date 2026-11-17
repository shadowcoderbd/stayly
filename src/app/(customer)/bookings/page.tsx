import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/Page";
import { bookingQueries, loadMyBookingParams, MyBookings, toMyBookingsQuery } from "@/features/bookings";
import * as bookingService from "@/server/modules/booking/booking.service";
import { getServerQueryClient } from "@/lib/query/server";
import { requireCustomer } from "@/server/lib/auth";

export const metadata: Metadata = { title: "My bookings" };

export default async function MyBookingsPage({ searchParams }: PageProps<"/bookings">) {
  const actor = await requireCustomer("/bookings");
  const query = toMyBookingsQuery(await loadMyBookingParams(searchParams));
  const queryClient = getServerQueryClient();

  // Interactive list: prefetch with the service (bound to the actor); the hooks refetch through /api.
  await Promise.all([
    queryClient.prefetchQuery(bookingQueries.list(query, (p) => bookingService.listMine(actor, p))),
    queryClient.prefetchQuery(bookingQueries.counts(() => bookingService.countsMine(actor))),
  ]);

  return (
    <PageContainer size="md">
      <PageHeader title="My bookings" description="Track your requests and upcoming stays." />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <MyBookings />
      </HydrationBoundary>
    </PageContainer>
  );
}
