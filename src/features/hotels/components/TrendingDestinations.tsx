"use client";

import { plural } from "@/lib/utils";
import { useHotelListParams } from "../hooks/useHotelListParams";
import type { Destination } from "@/server/modules/hotel/hotel.types";
import { scrollToAllHotels } from "./HeroSearch";
import { SectionHeading } from "./SectionHeading";

export function TrendingDestinations({ destinations }: { destinations: Destination[] }) {
  const { setFilter } = useHotelListParams();
  if (destinations.length === 0) return null;

  return (
    <section className="flex flex-col gap-5">
      <SectionHeading title="Trending destinations" description="Where people are searching most this month." />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
        {destinations.map((d) => (
          <button
            key={d.city}
            type="button"
            onClick={() => {
              setFilter({ location: d.city, q: "" });
              scrollToAllHotels();
            }}
            className="group relative h-55 cursor-pointer overflow-hidden rounded-[14px] bg-line text-left"
            aria-label={`Show hotels in ${d.city}, ${plural(d.hotelCount, "hotel")}`}
          >
            {d.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- API serves resized webp
              <img src={d.imageUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
            )}
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_40%,rgba(0,0,0,.72)_100%)]" />
            <span className="absolute right-3.5 bottom-3.5 left-3.5 flex flex-col gap-1 text-white">
              <span className="text-lg font-semibold tracking-tight">{d.city}</span>
              <span className="text-[13px] text-[#f0f0f0]">{plural(d.hotelCount, "hotel")}</span>
            </span>
            {d.trendPct !== null && (
              <span className="absolute top-3 left-3 inline-flex h-6 items-center rounded-full bg-white px-2.5 text-xs font-semibold text-green-fg">
                ↑ {d.trendPct}%
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
