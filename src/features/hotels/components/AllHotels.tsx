"use client";

import { X } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/States";
import { EmptyState } from "@/components/ui/States";
import { cn, plural } from "@/lib/utils";
import { useHotels } from "../hooks/useHotels";
import { dateQuery } from "../search-params";
import { HotelCard } from "./HotelCard";
import { scrollToAllHotels } from "./HeroSearch";
import { SectionHeading } from "./SectionHeading";

export function AllHotels() {
  const { hotels, pagination, query, isLoading, isFetching, setPage, clearFilters } = useHotels();

  const isFiltered = !!(query.q || query.location);
  const total = pagination?.totalDocs ?? 0;
  const filterLabel = [query.location, query.q ? `“${query.q}”` : ""].filter(Boolean).join(" · ");
  const linkQuery = dateQuery(query);

  return (
    <section id="all" className="flex scroll-mt-6 flex-col gap-5">
      <SectionHeading
        title="All hotels"
        description={isLoading ? "Loading hotels…" : `${plural(total, "hotel")} ${isFiltered || query.checkIn ? "match your search" : "available"}`}
        action={
          isFiltered && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[13px] font-medium hover:bg-hover"
            >
              {filterLabel}
              <X className="size-3.5" aria-hidden />
              <span className="sr-only">Clear filter</span>
            </button>
          )
        }
      />

      {isLoading ? (
        <Spinner label="Loading hotels" />
      ) : hotels.length === 0 ? (
        <EmptyState>
          {query.checkIn
            ? "No hotels have rooms for those dates. Try other dates or another location."
            : "No hotels match your search. Try another name or location."}
        </EmptyState>
      ) : (
        <ul
          aria-busy={isFetching}
          className={cn("grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5 transition-opacity", isFetching && "opacity-60")}
        >
          {hotels.map((h) => (
            <li key={h.id}>
              <HotelCard hotel={h} href={`/hotels/${h.slug}${linkQuery}`} />
            </li>
          ))}
        </ul>
      )}

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalDocs={pagination.totalDocs}
          label="hotels"
          onChange={(page) => {
            setPage(page);
            scrollToAllHotels();
          }}
        />
      )}
    </section>
  );
}
