import Link from "next/link";
import { StarIcon } from "@/components/ui/Stars";
import { formatPrice } from "@/lib/format";
import type { HotelCard } from "@/server/modules/hotel/hotel.types";
import { HotelImage } from "./HotelImage";
import { SectionHeading } from "./SectionHeading";

/** Read-only, rendered on the server (architecture.md §4). */
export function TopRated({ hotels, linkQuery }: { hotels: HotelCard[]; linkQuery: string }) {
  if (hotels.length === 0) return null;
  return (
    <section className="flex flex-col gap-5">
      <SectionHeading
        title="Top rated hotels"
        description="The highest guest scores on Stayly, updated weekly."
        action={
          <a href="#all" className="border-b border-faint text-sm font-medium">
            View all
          </a>
        }
      />
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
        {hotels.map((h, i) => (
          <li key={h.id}>
            <Link
              href={`/hotels/${h.slug}${linkQuery}`}
              className="flex h-full flex-col overflow-hidden rounded-[14px] border border-line bg-surface transition hover:border-faint hover:shadow-[0_6px_20px_rgba(0,0,0,.06)]"
            >
              <div className="relative">
                <HotelImage image={h.cover} fallbackAlt={h.name} className="h-55" />
                <span className="absolute top-3 left-3 flex size-9 items-center justify-center rounded-full bg-white text-sm font-bold">
                  <span className="sr-only">Rank </span>#{i + 1}
                </span>
                <span className="absolute top-4.5 right-3 inline-flex h-6 items-center rounded-full bg-primary px-2.5 text-xs font-semibold text-white">
                  Guest favourite
                </span>
              </div>
              <div className="flex flex-col gap-2 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[17px] font-semibold">{h.name}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold">
                    <StarIcon />
                    <span className="sr-only">Rated </span>
                    {h.ratingAvg?.toFixed(1)}
                  </span>
                </div>
                <div className="text-sm text-muted">
                  {h.city}, {h.country} · {h.reviewCount.toLocaleString("en-US")} reviews
                </div>
                <div className="text-sm">
                  <span className="text-[17px] font-semibold">{formatPrice(h.nightlyRateCents)}</span> <span className="text-muted">/ night</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
