import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { TrendingHotel } from "@/server/modules/hotel/hotel.types";
import { HotelImage } from "./HotelImage";
import { SectionHeading } from "./SectionHeading";

/** Read-only, rendered on the server. Hidden when nothing was requested this week (spec F-03). */
export function TrendingThisWeek({ hotels, linkQuery }: { hotels: TrendingHotel[]; linkQuery: string }) {
  if (hotels.length === 0) return null;
  return (
    <section className="flex flex-col gap-5 rounded-[20px] border border-line bg-surface p-5 sm:p-7">
      <SectionHeading title="Trending this week" description="Booking fast. Request early to get your dates." />
      <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1.5">
        {hotels.map((h) => (
          <li key={h.id} className="flex-[0_0_300px] snap-start">
            <Link href={`/hotels/${h.slug}${linkQuery}`} className="flex items-center gap-3.5 rounded-[14px] border border-line bg-canvas p-2.5 hover:border-faint">
              <HotelImage image={h.cover} fallbackAlt={h.name} className="size-24 flex-none rounded-[10px]" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="inline-flex h-6 items-center self-start rounded-full bg-orange-bg px-2.5 text-xs font-semibold text-orange-fg">
                  Booked {h.bookedThisWeek}× this week
                </span>
                <span className="text-[15px] font-semibold">{h.name}</span>
                <span className="text-[13px] text-muted">
                  {h.city}, {h.country}
                </span>
                <span className="text-[13px]">
                  <b>{formatPrice(h.nightlyRateCents)}</b> <span className="text-muted">/ night{h.ratingAvg !== null && ` · ★ ${h.ratingAvg.toFixed(1)}`}</span>
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
