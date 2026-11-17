import Link from "next/link";
import { buttonStyles } from "@/components/ui/Button";
import { HotelImage } from "@/features/hotels";
import { formatMoney, formatStay } from "@/lib/format";
import { cn, plural } from "@/lib/utils";
import { hasReceipt } from "@/lib/domain/booking";
import type { Booking } from "@/server/modules/booking/booking.types";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { CancelBookingDialog } from "./CancelBookingDialog";

export function BookingCard({ booking: b }: { booking: Booking }) {
  const isRejected = b.status === "rejected";
  const isMuted = isRejected || b.status === "cancelled";

  return (
    <article className="flex flex-wrap items-center gap-5 rounded-xl border border-line bg-surface p-5">
      <HotelImage image={b.hotel.cover} fallbackAlt={b.hotel.name} className="size-24 flex-none rounded-[10px]" />
      <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
        <h2 className="text-base font-semibold">
          <Link href={`/hotels/${b.hotel.slug}`} className="hover:underline">
            {b.hotel.name}
          </Link>
        </h2>
        <p className="text-sm text-muted">
          {b.hotel.city}, {b.hotel.country}
        </p>
        <p className="text-sm">
          {formatStay(b.checkIn, b.checkOut)} · {plural(b.nights, "night")} · {plural(b.guests, "guest")}
        </p>
        {isRejected && b.rejectionReason && <p className="text-[13px] text-red-fg">Reason: {b.rejectionReason}</p>}
      </div>
      <div className="flex min-w-30 flex-col items-start gap-1.5">
        <BookingStatusBadge status={b.status} />
        <span className="text-[13px] text-muted">
          Ref {b.ref}
          {b.isCompleted && " · Completed"}
        </span>
      </div>
      <div className="ml-auto flex flex-col items-end gap-2">
        <span className={cn("text-base font-semibold", isMuted && "text-muted")}>{formatMoney(b.totalCents)}</span>
        <div className="flex flex-wrap justify-end gap-2">
          {b.canCancel && !b.isCompleted && <CancelBookingDialog booking={b} />}
          {hasReceipt(b) && (
            <Link href={`/bookings/${b.ref}/receipt`} className={buttonStyles({ variant: "outline", size: "md" })}>
              View receipt
            </Link>
          )}
          {isRejected && (
            <Link href={`/?location=${encodeURIComponent(b.hotel.city)}#all`} className={buttonStyles({ variant: "outline", size: "md" })}>
              Find another
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
