import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BookingRequestPanel } from "@/features/bookings";
import { HotelAbout, HotelGallery, HotelHeader } from "@/features/hotels";
import * as hotelService from "@/server/modules/hotel/hotel.service";
import { PageContainer } from "@/components/layout/Page";
import { buildQueryString } from "@/lib/query-string";

// Read-only page data: the service is called directly, once per request (architecture.md §5.1).
const getHotel = cache((slug: string) => hotelService.findBySlug(slug));

export async function generateMetadata({ params }: PageProps<"/hotels/[slug]">): Promise<Metadata> {
  const hotel = await getHotel((await params).slug);
  return hotel
    ? { title: hotel.name, description: hotel.description.slice(0, 160) || `${hotel.name} in ${hotel.city}, ${hotel.country}.` }
    : { title: "Hotel not found" };
}

export default async function HotelPage({ params, searchParams }: PageProps<"/hotels/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const hotel = await getHotel(slug);
  if (!hotel) notFound();

  // "← All hotels" keeps the browse filters the guest came from (spec F-04).
  const keep = (k: string) => (typeof sp[k] === "string" ? sp[k] : undefined);
  const backHref = `/${buildQueryString({ q: keep("q"), location: keep("location"), checkIn: keep("checkIn"), checkOut: keep("checkOut") })}#all`;

  return (
    <PageContainer className="gap-7">
      <div className="flex flex-col gap-4">
        <HotelHeader hotel={hotel} backHref={backHref} />
      </div>
      <HotelGallery hotel={hotel} />
      <div className="flex flex-wrap items-start gap-10">
        <HotelAbout hotel={hotel} />
        <BookingRequestPanel hotel={hotel} />
      </div>
    </PageContainer>
  );
}
