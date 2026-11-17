"use client";

import { usePathname, useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { useMe } from "@/features/auth";
import { stayError, useAvailability, type HotelDetail } from "@/features/hotels";
import { addDays, formatMoney, formatPrice, nightsBetween, todayLocal } from "@/lib/format";
import { buildQueryString } from "@/lib/query-string";
import { plural } from "@/lib/utils";
import { useCreateBooking } from "../hooks/useCreateBooking";
import { MAX_GUESTS } from "@/lib/domain/booking";
import { stayParsers } from "../search-params";

type Props = { hotel: Pick<HotelDetail, "id" | "nightlyRateCents" | "taxRate"> };

/** Price, dates and the "Request booking" action from the hotel page (spec F-05). */
export function BookingRequestPanel({ hotel }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn, isAdmin } = useMe();
  const [stay, setStay] = useQueryStates(stayParsers, { scroll: false, history: "replace" });
  const { createBooking, isCreating } = useCreateBooking();

  const today = todayLocal();
  const { checkIn, checkOut } = stay;
  const guests = Math.min(Math.max(stay.guests, 1), MAX_GUESTS);
  const error = stayError(checkIn, checkOut);
  const hasStay = !!checkIn && !!checkOut && !error;
  const { availability, isChecking } = useAvailability(hotel.id, hasStay ? checkIn : "", hasStay ? checkOut : "");

  // Display estimate only. The API recomputes the price and stores it on the booking.
  const nights = hasStay ? nightsBetween(checkIn, checkOut) : 0;
  const subtotal = hotel.nightlyRateCents * nights;
  const tax = Math.round(subtotal * hotel.taxRate);
  const isFullyBooked = availability?.available === false;

  const onCheckIn = (value: string) => {
    const bumpCheckOut = value && (!checkOut || checkOut <= value);
    setStay({ checkIn: value, ...(bumpCheckOut ? { checkOut: addDays(value, 1) } : {}) });
  };

  const onRequest = () => {
    if (!isSignedIn) {
      const back = pathname + buildQueryString({ checkIn, checkOut, guests });
      router.push(`/login?redirectTo=${encodeURIComponent(back)}`);
      return;
    }
    createBooking({ hotelId: hotel.id, checkIn, checkOut, guests }, { onSuccess: () => router.push("/bookings") });
  };

  return (
    <aside
      aria-label="Request a booking"
      className="flex max-w-full flex-[1_1_340px] flex-col gap-4 self-start rounded-xl border border-line bg-surface p-6 md:sticky md:top-6"
    >
      <div>
        <span className="text-2xl font-semibold tracking-[-0.02em]">{formatPrice(hotel.nightlyRateCents)}</span>{" "}
        <span className="text-sm text-muted">/ night</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Check-in" htmlFor="ci">
          <Input id="ci" type="date" min={today} value={checkIn} onChange={(e) => onCheckIn(e.target.value)} />
        </Field>
        <Field label="Check-out" htmlFor="co">
          <Input
            id="co"
            type="date"
            min={checkIn ? addDays(checkIn, 1) : addDays(today, 1)}
            value={checkOut}
            onChange={(e) => setStay({ checkOut: e.target.value })}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? "stay-error" : undefined}
          />
        </Field>
      </div>
      <Field label="Guests" htmlFor="g">
        <Select id="g" value={guests} onChange={(e) => setStay({ guests: Number(e.target.value) })}>
          {Array.from({ length: MAX_GUESTS }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {plural(n, "guest")}
            </option>
          ))}
        </Select>
      </Field>

      <div aria-live="polite" className="min-h-5 text-[13px]">
        {error ? (
          <p id="stay-error" className="text-red-fg">
            {error}
          </p>
        ) : !hasStay ? (
          <p className="text-muted">Pick your dates to see the total.</p>
        ) : isChecking ? (
          <p className="text-muted">Checking availability…</p>
        ) : availability ? (
          isFullyBooked ? (
            <p className="font-medium text-red-fg">Fully booked for these dates.</p>
          ) : (
            <p className="font-medium text-green-fg">
              Rooms available{availability.roomsLeft <= 3 ? ` · only ${availability.roomsLeft} left` : ""}
            </p>
          )
        ) : null}
      </div>

      {hasStay && (
        <dl className="flex flex-col gap-2 border-t border-line pt-3.5 text-sm">
          <div className="flex justify-between text-muted">
            <dt>
              {formatPrice(hotel.nightlyRateCents)} × {plural(nights, "night")}
            </dt>
            <dd>{formatMoney(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>Taxes &amp; fees</dt>
            <dd>{formatMoney(tax)}</dd>
          </div>
          <div className="flex justify-between text-[15px] font-semibold">
            <dt>Total</dt>
            <dd>{formatMoney(subtotal + tax)}</dd>
          </div>
        </dl>
      )}

      <Button onClick={onRequest} isLoading={isCreating} disabled={!hasStay || isFullyBooked || isAdmin}>
        Request booking
      </Button>
      <p className="text-[13px] leading-normal text-muted">
        {isAdmin
          ? "You're signed in as an admin. Use a customer account to request bookings."
          : "The hotel reviews every request. You are only charged once it is approved."}
      </p>
    </aside>
  );
}
