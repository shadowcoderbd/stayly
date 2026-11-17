import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { StarIcon } from "@/components/ui/Stars";
import { cn, plural } from "@/lib/utils";
import type { HotelDetail } from "@/server/modules/hotel/hotel.types";
import { HotelImage } from "./HotelImage";

export function HotelHeader({ hotel, backHref }: { hotel: HotelDetail; backHref: string }) {
  return (
    <>
      <Link href={backHref} className="inline-flex items-center gap-1.5 self-start text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All hotels
      </Link>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.02em]">{hotel.name}</h1>
        <p className="flex flex-wrap items-center gap-x-1.5 text-[15px] text-muted">
          <span>
            {hotel.city}, {hotel.country}
          </span>
          {hotel.ratingAvg !== null && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <StarIcon className="size-3.5 text-ink" />
                <span className="sr-only">Rated</span> {hotel.ratingAvg.toFixed(1)}
                <span className="sr-only">from {hotel.reviewCount} reviews</span>
              </span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>{plural(hotel.rooms, "room")}</span>
        </p>
      </div>
    </>
  );
}

/** Cover large + up to two more photos (spec F-04). Adapts to 1–3 photos and stacks on phones. */
export function HotelGallery({ hotel }: { hotel: HotelDetail }) {
  const [cover, ...rest] = hotel.images;
  const side = rest.slice(0, 2);
  if (!cover) return <HotelImage image={null} fallbackAlt={hotel.name} className="h-72 rounded-[14px]" />;

  return (
    <div className={cn("grid gap-3", side.length > 0 && "md:h-95 md:grid-cols-[2fr_1fr]")}>
      <HotelImage image={cover} fallbackAlt={hotel.name} priority className="h-64 rounded-[14px] md:h-full md:min-h-0" />
      {side.length > 0 && (
        <div className={cn("grid min-h-0 gap-3", side.length === 2 ? "grid-cols-2 md:grid-cols-1 md:grid-rows-2" : "grid-cols-1")}>
          {side.map((img) => (
            <HotelImage key={img.id} image={img} fallbackAlt={hotel.name} className="h-36 rounded-[14px] md:h-full md:min-h-0" />
          ))}
        </div>
      )}
    </div>
  );
}

export function HotelAbout({ hotel }: { hotel: HotelDetail }) {
  return (
    <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-7">
      {hotel.description && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-lg font-semibold">About</h2>
          <p className="text-[15px] leading-relaxed text-body">{hotel.description}</p>
        </section>
      )}
      {hotel.amenities.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Amenities</h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5 text-sm">
            {hotel.amenities.map((a) => (
              <li key={a} className="rounded-lg border border-line bg-surface px-3 py-2.5">
                {a}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="flex flex-col gap-2.5">
        <h2 className="text-lg font-semibold">Policies</h2>
        <p className="text-sm leading-relaxed text-body">
          Check-in from {hotel.checkInTime}, check-out by {hotel.checkOutTime}.{" "}
          {hotel.freeCancellationHours > 0
            ? `Free cancellation up to ${hotel.freeCancellationHours} hours before arrival.`
            : "Approved bookings can be cancelled for a full refund until check-in."}
        </p>
      </section>
    </div>
  );
}
