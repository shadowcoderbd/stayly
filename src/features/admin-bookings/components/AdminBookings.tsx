"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChipTabs } from "@/components/ui/ChipTabs";
import { fieldStyles } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, Spinner } from "@/components/ui/States";
import { Table, TableCard, Td, Th, Tr } from "@/components/ui/Table";
import { BookingStatusBadge, type AdminBooking, type AdminBookingsQuery } from "@/features/bookings";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatDay, formatMoney, formatStay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAdminBookings } from "../hooks/useAdminBookings";
import { useApproveBooking } from "../hooks/useBookingDecisions";
import { RejectDialog } from "./RejectDialog";

type Tab = AdminBookingsQuery["status"];

const EMPTY: Record<Tab, string> = {
  pending: "No requests waiting. You're all caught up.",
  approved: "No approved bookings match.",
  rejected: "No rejected requests match.",
  all: "No bookings match.",
};

/** Admin · Booking requests (spec F-12). */
export function AdminBookings({ hotels }: { hotels: { id: string; name: string }[] }) {
  const { bookings, pagination, counts, params, isLoading, isFetching, setStatus, setHotel, setSearch, setPage } = useAdminBookings();
  const { approveBooking, isApproving, approvingId } = useApproveBooking();

  const [search, setSearchDraft] = useState(params.search);
  const debounced = useDebouncedValue(search, 300);
  useEffect(() => {
    if (debounced !== params.search) setSearch(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [debounced]);

  const n = (k: Exclude<Tab, "all">) => (counts ? ` · ${counts[k]}` : "");
  const isFiltered = !!params.search || !!params.hotelId;

  return (
    <>
      <ChipTabs<Tab>
        label="Filter by status"
        value={params.status}
        onChange={setStatus}
        tabs={[
          { value: "pending", label: `Pending${n("pending")}` },
          { value: "approved", label: `Approved${n("approved")}` },
          { value: "rejected", label: `Rejected${n("rejected")}` },
          { value: "all", label: "All" },
        ]}
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-0 flex-[2_1_260px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <input
            type="search"
            aria-label="Search by ref, guest name or email"
            placeholder="Search ref, guest name or email"
            value={search}
            onChange={(e) => setSearchDraft(e.target.value)}
            className={cn(fieldStyles, "h-10 pl-9")}
          />
        </div>
        <select
          aria-label="Filter by hotel"
          value={params.hotelId}
          onChange={(e) => setHotel(e.target.value)}
          className={cn(fieldStyles, "h-10 flex-[1_1_200px] cursor-pointer")}
        >
          <option value="">All hotels</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Spinner label="Loading requests" />
      ) : bookings.length === 0 ? (
        <EmptyState>{isFiltered ? "No bookings match these filters." : EMPTY[params.status]}</EmptyState>
      ) : (
        <TableCard className={cn("transition-opacity", isFetching && !isApproving && "opacity-60")}>
          <Table aria-busy={isFetching}>
            <caption className="sr-only">Booking requests</caption>
            <thead>
              <tr>
                <Th scope="col">Ref</Th>
                <Th scope="col">Guest</Th>
                <Th scope="col">Hotel</Th>
                <Th scope="col">Dates</Th>
                <Th scope="col">Nights</Th>
                <Th scope="col">Total</Th>
                <Th scope="col">Requested</Th>
                <Th scope="col">Status</Th>
                <Th scope="col" className="text-right">
                  Decision
                </Th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <Tr key={b.id}>
                  <Td>{b.ref}</Td>
                  <Td>
                    <div className="font-semibold">{b.guest.name}</div>
                    <div className="text-[13px] text-muted">{b.guest.email}</div>
                  </Td>
                  <Td>
                    <div>{b.hotel.name}</div>
                    <RoomsHint booking={b} />
                  </Td>
                  <Td>{formatStay(b.checkIn, b.checkOut, { omitCurrentYear: true })}</Td>
                  <Td>{b.nights}</Td>
                  <Td>{formatMoney(b.totalCents)}</Td>
                  <Td>{formatDay(b.createdAt)}</Td>
                  <Td>
                    <BookingStatusBadge status={b.status} short />
                  </Td>
                  <Td className="text-right">
                    {b.status === "pending" ? (
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => approveBooking(b.id)}
                          isLoading={isApproving && approvingId === b.id}
                          disabled={b.roomsLeft === 0}
                          aria-label={`Approve ${b.ref}`}
                        >
                          Approve
                        </Button>
                        <RejectDialog booking={b} />
                      </div>
                    ) : (
                      <DecisionNote booking={b} />
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableCard>
      )}

      {pagination && (
        <Pagination page={pagination.page} totalPages={pagination.totalPages} totalDocs={pagination.totalDocs} label="bookings" onChange={setPage} />
      )}

      <p className="text-[13px] text-muted">
        Approving confirms the stay and records the payment. Rejecting asks for a short reason that the customer will see.
      </p>
    </>
  );
}

/** Conflict hint from the same availability calculation the server uses on approve. */
function RoomsHint({ booking: b }: { booking: AdminBooking }) {
  if (b.status !== "pending" || b.roomsLeft === null || b.roomsLeft > 1) return null;
  return b.roomsLeft === 0 ? (
    <div className="text-[13px] font-medium text-red-fg">Fully booked</div>
  ) : (
    <div className="text-[13px] font-medium text-amber-fg">Only 1 room left for these dates</div>
  );
}

function DecisionNote({ booking: b }: { booking: AdminBooking }) {
  if (b.status === "rejected")
    return (
      <span className="inline-block max-w-56 truncate align-middle text-[13px] text-muted" title={b.rejectionReason ?? undefined}>
        {b.rejectionReason}
      </span>
    );
  const date = b.status === "cancelled" ? b.cancelledAt : b.decidedAt;
  return <span className="text-[13px] text-muted">{date ? `${b.status === "cancelled" ? "Cancelled" : "Decided"} ${formatDay(date)}` : "—"}</span>;
}
