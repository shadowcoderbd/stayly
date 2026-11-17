import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatDate, formatMoney, formatPrice, formatStay } from "@/lib/format";
import { plural } from "@/lib/utils";
import type { BookingDetail } from "@/server/modules/booking/booking.types";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { PrintButton } from "./PrintButton";

/** Printable receipt (spec F-07). Read-only, rendered on the server. */
export function Receipt({ booking: b }: { booking: BookingDetail }) {
  return (
    <>
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/bookings" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> My bookings
        </Link>
        <PrintButton />
      </div>

      <article className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 sm:p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[17px] font-semibold tracking-tight">Stayly</p>
            <h1 className="text-2xl font-semibold tracking-tight">Receipt</h1>
            <p className="text-sm text-muted">Ref {b.ref}</p>
          </div>
          <BookingStatusBadge status={b.status} />
        </header>

        <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Hotel</dt>
            <dd className="font-medium">
              {b.hotel.name}, {b.hotel.city}, {b.hotel.country}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Stay</dt>
            <dd className="font-medium">
              {formatStay(b.checkIn, b.checkOut)} · {plural(b.nights, "night")} · {plural(b.guests, "guest")}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Requested</dt>
            <dd className="font-medium">{formatDate(b.createdAt)}</dd>
          </div>
          {b.decidedAt && (
            <div>
              <dt className="text-muted">Approved</dt>
              <dd className="font-medium">{formatDate(b.decidedAt)}</dd>
            </div>
          )}
        </dl>

        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Charges</caption>
          <tbody>
            <tr>
              <th scope="row" className="py-2 text-left font-normal text-muted">
                {formatPrice(b.nightlyRateCents)} × {plural(b.nights, "night")}
              </th>
              <td className="py-2 text-right">{formatMoney(b.subtotalCents)}</td>
            </tr>
            <tr>
              <th scope="row" className="py-2 text-left font-normal text-muted">
                Taxes &amp; fees
              </th>
              <td className="py-2 text-right">{formatMoney(b.taxCents)}</td>
            </tr>
            <tr className="border-t border-line">
              <th scope="row" className="pt-3 text-left text-[15px] font-semibold">
                Total
              </th>
              <td className="pt-3 text-right text-[15px] font-semibold">{formatMoney(b.totalCents)}</td>
            </tr>
          </tbody>
        </table>

        {b.transactions.length > 0 && (
          <section className="flex flex-col gap-2 border-t border-line pt-4">
            <h2 className="text-sm font-semibold">Payments</h2>
            <ul className="flex flex-col gap-1.5 text-sm">
              {b.transactions.map((t) => (
                <li key={t.id} className="flex justify-between">
                  <span className="text-muted">
                    {t.type === "payment" ? "Paid" : "Refunded"} on {formatDate(t.createdAt)}
                  </span>
                  <span className="font-medium">{t.type === "refund" ? `−${formatMoney(t.amountCents)}` : formatMoney(t.amountCents)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  );
}
