"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonStyles } from "@/components/ui/Button";
import { fieldStyles, Label } from "@/components/ui/Field";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { addDays, todayLocal } from "@/lib/format";
import { cn, plural } from "@/lib/utils";
import { useHotelListParams } from "../hooks/useHotelListParams";
import type { Location } from "@/server/modules/hotel/hotel.types";
import { stayError } from "../search-params";

export const scrollToAllHotels = () => document.getElementById("all")?.scrollIntoView({ behavior: "smooth", block: "start" });

const PROMO = "Winter escapes · up to 20% off"; // static in v1 (spec F-03)

export function HeroSearch({ locations }: { locations: Location[] }) {
  const { params, setFilter } = useHotelListParams();
  const cityCount = new Set(locations.map((l) => l.city)).size;

  // The name field types into local state; the URL (and the query) follow 300 ms later (spec F-03).
  const [q, setQ] = useState(params.q);
  const debouncedQ = useDebouncedValue(q, 300);
  useEffect(() => {
    if (debouncedQ !== params.q) setFilter({ q: debouncedQ });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [debouncedQ]);
  // Keep the field in sync when filters change elsewhere (destination click, clear chip).
  const [syncedQ, setSyncedQ] = useState(params.q);
  if (params.q !== syncedQ) {
    setSyncedQ(params.q);
    setQ(params.q);
  }

  const today = todayLocal();
  const dateError = stayError(params.checkIn, params.checkOut);

  const onCheckIn = (checkIn: string) => {
    const needsCheckOut = checkIn && (!params.checkOut || params.checkOut <= checkIn);
    setFilter({ checkIn, ...(needsCheckOut ? { checkOut: addDays(checkIn, 1) } : {}) });
  };

  return (
    <section className="relative flex min-h-[520px] items-end overflow-hidden bg-[#1a2a3a]">
      {/* eslint-disable-next-line @next/next/no-img-element -- static hero, already compressed */}
      <img src="/hero.jpg" alt="" className="absolute inset-0 size-full object-cover" fetchPriority="high" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.15)_0%,rgba(0,0,0,.55)_70%,rgba(0,0,0,.7)_100%)]" />
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-4 pt-24 pb-10 sm:px-6">
        <div className="flex max-w-[640px] flex-col gap-3 text-white">
          <span className="inline-flex h-6 items-center self-start rounded-full bg-white/20 px-2.5 text-xs font-semibold backdrop-blur-md">
            {PROMO}
          </span>
          <h1 className="text-[40px] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[52px]">Stay somewhere worth remembering.</h1>
          <p className="text-[17px] leading-normal text-[#f0f0f0]">
            Hand-picked hotels in {plural(cityCount, "city", "cities")}. Request a room in a minute and hear back within a day.
          </p>
        </div>

        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter({ q });
            scrollToAllHotels();
          }}
          className="flex flex-wrap items-end gap-3 rounded-[14px] bg-surface p-4 shadow-[0_20px_50px_rgba(0,0,0,.25)]"
        >
          <div className="flex min-w-0 flex-[2_1_220px] flex-col gap-1.5">
            <Label htmlFor="q" className="text-xs font-semibold">
              Hotel name
            </Label>
            <input id="q" type="search" placeholder="e.g. Harbor House" value={q} onChange={(e) => setQ(e.target.value)} className={cn(fieldStyles, "h-11")} />
          </div>
          <div className="flex min-w-0 flex-[1.4_1_180px] flex-col gap-1.5">
            <Label htmlFor="loc" className="text-xs font-semibold">
              Location
            </Label>
            <select id="loc" value={params.location} onChange={(e) => setFilter({ location: e.target.value })} className={cn(fieldStyles, "h-11 cursor-pointer")}>
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l.city} value={l.city}>
                  {l.city}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-0 flex-[1_1_150px] flex-col gap-1.5">
            <Label htmlFor="ci" className="text-xs font-semibold">
              Check-in
            </Label>
            <input id="ci" type="date" min={today} value={params.checkIn} onChange={(e) => onCheckIn(e.target.value)} className={cn(fieldStyles, "h-11")} />
          </div>
          <div className="flex min-w-0 flex-[1_1_150px] flex-col gap-1.5">
            <Label htmlFor="co" className="text-xs font-semibold">
              Check-out
            </Label>
            <input
              id="co"
              type="date"
              min={params.checkIn ? addDays(params.checkIn, 1) : addDays(today, 1)}
              value={params.checkOut}
              onChange={(e) => setFilter({ checkOut: e.target.value })}
              className={cn(fieldStyles, "h-11")}
              aria-invalid={!!dateError || undefined}
              aria-describedby={dateError ? "date-error" : undefined}
            />
          </div>
          <button type="submit" className={buttonStyles({ className: "flex-none" })}>
            <Search className="size-4" aria-hidden /> Search
          </button>
          {dateError && (
            <p id="date-error" role="alert" className="w-full text-[13px] text-red-fg">
              {dateError} Dates are ignored until they&apos;re fixed.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
