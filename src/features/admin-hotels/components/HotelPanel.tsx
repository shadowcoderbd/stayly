"use client";

import { ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { forwardRef } from "react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAdminHotel } from "../hooks/useAdminHotels";
import { HotelForm } from "./HotelForm";
import { HotelStatusBadge } from "./HotelStatusBadge";
import { PhotoManager } from "./PhotoManager";

type Props = { editId: string | null; onNew: () => void; onCreated: (id: string) => void };

/** The side panel: "New hotel", or the same form filled in for `?edit=<id>` (spec F-11). */
export const HotelPanel = forwardRef<HTMLElement, Props>(function HotelPanel({ editId, onNew, onCreated }, ref) {
  const { hotel, isLoading, isError } = useAdminHotel(editId);

  return (
    <section
      ref={ref}
      aria-labelledby="panel-heading"
      className="flex max-w-full flex-[1_1_360px] scroll-mt-6 flex-col gap-4 self-start rounded-xl border border-line bg-surface p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="panel-heading" className="truncate text-lg font-semibold">
            {editId ? (hotel ? `Edit ${hotel.name}` : "Edit hotel") : "New hotel"}
          </h2>
          {hotel && (
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <HotelStatusBadge status={hotel.status} />
              {hotel.status === "published" && (
                <Link href={`/hotels/${hotel.slug}`} target="_blank" className="inline-flex items-center gap-1 hover:text-ink">
                  View page <ExternalLink className="size-3" aria-hidden />
                </Link>
              )}
            </div>
          )}
        </div>
        {editId && (
          <Button variant="outline" size="sm" onClick={onNew}>
            <Plus className="size-3.5" aria-hidden /> New hotel
          </Button>
        )}
      </div>

      {!editId ? (
        <HotelForm key="new" onCreated={onCreated} />
      ) : isLoading ? (
        <div className="flex flex-col gap-3" aria-busy>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : isError || !hotel ? (
        <p className="text-sm text-muted">This hotel couldn&apos;t be loaded.</p>
      ) : (
        <>
          <HotelForm key={hotel.id} hotel={hotel} />
          <PhotoManager key={`photos-${hotel.id}`} hotelId={hotel.id} images={hotel.images} isPublished={hotel.status === "published"} />
        </>
      )}
    </section>
  );
});
