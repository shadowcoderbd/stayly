"use client";

import Link from "next/link";
import { buttonStyles } from "@/components/ui/Button";
import { ChipTabs } from "@/components/ui/ChipTabs";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, Spinner } from "@/components/ui/States";
import { cn } from "@/lib/utils";
import { useMyBookings } from "../hooks/useMyBookings";
import type { BOOKING_TABS } from "@/lib/domain/booking";
import { BookingCard } from "./BookingCard";

type Tab = (typeof BOOKING_TABS)[number];

const EMPTY: Record<Tab, string> = {
  all: "You haven't requested any stays yet.",
  pending: "No requests are waiting for review.",
  approved: "No approved stays yet.",
  rejected: "No rejected requests.",
};

export function MyBookings() {
  const { bookings, pagination, counts, params, isLoading, isFetching, setStatus, setPage } = useMyBookings();
  const n = (k: Tab) => (counts ? ` · ${counts[k]}` : "");

  return (
    <>
      <ChipTabs<Tab>
        label="Filter bookings"
        value={params.status}
        onChange={setStatus}
        tabs={[
          { value: "all", label: `All${n("all")}` },
          { value: "pending", label: `Pending${n("pending")}` },
          { value: "approved", label: `Approved${n("approved")}` },
          { value: "rejected", label: `Rejected${n("rejected")}` },
        ]}
      />

      {isLoading ? (
        <Spinner label="Loading bookings" />
      ) : bookings.length === 0 ? (
        <EmptyState className="flex flex-col items-center gap-4">
          {EMPTY[params.status]}
          <Link href="/" className={buttonStyles({ size: "md" })}>
            Browse hotels
          </Link>
        </EmptyState>
      ) : (
        <div aria-busy={isFetching} className={cn("flex flex-col gap-3.5 transition-opacity", isFetching && "opacity-60")}>
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalDocs={pagination.totalDocs}
          label="bookings"
          onChange={setPage}
        />
      )}
    </>
  );
}
