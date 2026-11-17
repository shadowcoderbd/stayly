import Link from "next/link";
import { Rating } from "@/components/ui/Stars";
import { formatPrice } from "@/lib/format";
import type { HotelCard as HotelCardData } from "@/server/modules/hotel/hotel.types";
import { HotelImage } from "./HotelImage";

export function HotelCard({ hotel, href }: { hotel: HotelCardData; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col overflow-hidden rounded-[14px] border border-line bg-surface transition hover:border-faint hover:shadow-[0_6px_20px_rgba(0,0,0,.06)]"
    >
      <HotelImage image={hotel.cover} fallbackAlt={hotel.name} className="h-45" />
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-base font-semibold">{hotel.name}</span>
          <Rating value={hotel.ratingAvg} className="inline-flex items-center gap-1 text-sm font-medium" />
        </div>
        <div className="text-sm text-muted">
          {hotel.city}, {hotel.country}
        </div>
        <div className="text-sm">
          <span className="text-base font-semibold">{formatPrice(hotel.nightlyRateCents)}</span>{" "}
          <span className="text-muted">/ night</span>
        </div>
      </div>
    </Link>
  );
}
