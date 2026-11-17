"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChipTabs } from "@/components/ui/ChipTabs";
import { fieldStyles } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, Spinner } from "@/components/ui/States";
import { Table, TableCard, Td, Th, Tr } from "@/components/ui/Table";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAdminHotels } from "../hooks/useAdminHotels";
import type { AdminHotelsQuery } from "@/server/modules/hotel/hotel.types";
import { HotelPanel } from "./HotelPanel";
import { HotelStatusBadge } from "./HotelStatusBadge";

type StatusTab = AdminHotelsQuery["status"];

/** Admin · Hotels: the table, its filters, and the create/edit side panel (spec F-10 / F-11). */
export function AdminHotels() {
  const { hotels, pagination, isLoading, isFetching, params, editId, setPage, setSearch, setStatus, startEdit, startNew } =
    useAdminHotels();
  const panelRef = useRef<HTMLElement>(null);

  // Search box: local state, URL follows 300 ms later.
  const [q, setQ] = useState(params.q);
  const debouncedQ = useDebouncedValue(q, 300);
  useEffect(() => {
    if (debouncedQ !== params.q) setSearch(debouncedQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [debouncedQ]);

  const openEdit = (id: string) => {
    startEdit(id);
    // On narrow screens the panel sits under the table: bring it into view.
    if (window.matchMedia("(max-width: 959px)").matches) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-[1_1_220px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden />
            <input
              type="search"
              aria-label="Search hotels by name"
              placeholder="Search by name"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={cn(fieldStyles, "h-10 pl-9")}
            />
          </div>
          <ChipTabs<StatusTab>
            label="Filter by status"
            value={params.status}
            onChange={setStatus}
            tabs={[
              { value: "all", label: "All" },
              { value: "published", label: "Published" },
              { value: "hidden", label: "Hidden" },
            ]}
          />
        </div>

        {isLoading ? (
          <Spinner label="Loading hotels" />
        ) : hotels.length === 0 ? (
          <EmptyState>{params.q || params.status !== "all" ? "No hotels match these filters." : "No hotels yet. Create the first one."}</EmptyState>
        ) : (
          <TableCard className={cn("transition-opacity", isFetching && "opacity-60")}>
            <Table aria-busy={isFetching}>
              <caption className="sr-only">Hotels</caption>
              <thead>
                <tr>
                  <Th scope="col">Hotel</Th>
                  <Th scope="col">Location</Th>
                  <Th scope="col">Rooms</Th>
                  <Th scope="col">Rate / night</Th>
                  <Th scope="col">Status</Th>
                  <Th scope="col">
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {hotels.map((h) => (
                  <Tr key={h.id} className={cn(h.id === editId && "bg-hover")}>
                    <Td className="font-semibold">{h.name}</Td>
                    <Td>
                      {h.city}, {h.country}
                    </Td>
                    <Td>{h.rooms}</Td>
                    <Td>{formatPrice(h.nightlyRateCents)}</Td>
                    <Td>
                      <HotelStatusBadge status={h.status} />
                    </Td>
                    <Td className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(h.id)}
                        aria-label={`Edit ${h.name}`}
                        aria-pressed={h.id === editId}
                      >
                        Edit
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableCard>
        )}

        {pagination && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalDocs={pagination.totalDocs}
            label="hotels"
            onChange={setPage}
          />
        )}
      </div>

      <HotelPanel ref={panelRef} editId={editId} onNew={startNew} onCreated={startEdit} />
    </div>
  );
}
