"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Field, Input, invalidProps, Textarea } from "@/components/ui/Field";
import type { HotelDetail } from "@/features/hotels";
import { useCreateHotel, useUpdateHotel } from "../hooks/useHotelMutations";
import type { HotelStatus } from "@/server/modules/hotel/hotel.types";
import { hotelFormSchema, toHotelInput, type HotelFormInput, type HotelFormValues } from "../schemas";
import { AmenitiesInput } from "./AmenitiesInput";
import { PhotoPicker, type PendingPhoto } from "./PhotoPicker";

const EMPTY: HotelFormInput = {
  name: "",
  city: "",
  country: "",
  description: "",
  amenities: [],
  checkInTime: "15:00",
  checkOutTime: "11:00",
  freeCancellationHours: 48,
  rate: Number.NaN,
  rooms: Number.NaN,
};

const fromHotel = (h: HotelDetail): HotelFormInput => ({
  name: h.name,
  city: h.city,
  country: h.country,
  description: h.description,
  amenities: h.amenities,
  checkInTime: h.checkInTime,
  checkOutTime: h.checkOutTime,
  freeCancellationHours: h.freeCancellationHours,
  rate: h.nightlyRateCents / 100,
  rooms: h.rooms,
});

/** Create (no `hotel`) or edit a hotel. Remount with a new `key` to switch hotels. */
export function HotelForm({ hotel, onCreated }: { hotel?: HotelDetail; onCreated?: (id: string) => void }) {
  const isEdit = !!hotel;
  const form = useForm<HotelFormInput, unknown, HotelFormValues>({
    resolver: zodResolver(hotelFormSchema),
    defaultValues: hotel ? fromHotel(hotel) : EMPTY,
  });
  const { errors } = form.formState;
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const { createHotel, isCreating } = useCreateHotel();
  const { updateHotel, isUpdating } = useUpdateHotel(hotel?.id ?? "");
  const [submitting, setSubmitting] = useState<HotelStatus | "save" | null>(null);

  const submit = (status: HotelStatus | "save") =>
    form.handleSubmit((values) => {
      setSubmitting(status);
      if (hotel) {
        const next = status === "save" ? hotel.status : status;
        if (next === "published" && hotel.images.length === 0) return setPhotoError("Add at least one photo before publishing.");
        updateHotel(toHotelInput(values, next), { onSettled: () => setSubmitting(null) });
        return;
      }
      const publish = status === "published";
      if (publish && photos.length === 0) return setPhotoError("Add at least one photo to publish, or save as hidden.");
      createHotel(
        { input: toHotelInput(values, "hidden"), photos: photos.map(({ file, alt }) => ({ file, alt })), publish },
        { onSuccess: ({ hotel: created }) => onCreated?.(created.id), onSettled: () => setSubmitting(null) },
      );
    });

  const isBusy = isCreating || isUpdating;
  const err = (k: keyof HotelFormInput) => errors[k]?.message;
  const num = { valueAsNumber: true } as const;

  return (
    <form onSubmit={(e) => e.preventDefault()} noValidate className="flex flex-col gap-4">
      <Field label="Name" htmlFor="h-name" error={err("name")}>
        <Input id="h-name" placeholder="Hotel name" {...form.register("name")} {...invalidProps("h-name", err("name"))} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City" htmlFor="h-city" error={err("city")}>
          <Input id="h-city" {...form.register("city")} {...invalidProps("h-city", err("city"))} />
        </Field>
        <Field label="Country" htmlFor="h-country" error={err("country")}>
          <Input id="h-country" {...form.register("country")} {...invalidProps("h-country", err("country"))} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rate per night ($)" htmlFor="h-rate" error={err("rate")}>
          <Input id="h-rate" type="number" min={1} step="0.01" inputMode="decimal" {...form.register("rate", num)} {...invalidProps("h-rate", err("rate"))} />
        </Field>
        <Field label="Rooms" htmlFor="h-rooms" error={err("rooms")}>
          <Input id="h-rooms" type="number" min={1} step={1} inputMode="numeric" {...form.register("rooms", num)} {...invalidProps("h-rooms", err("rooms"))} />
        </Field>
      </div>
      <Field label="Description" htmlFor="h-desc" error={err("description")}>
        <Textarea id="h-desc" {...form.register("description")} {...invalidProps("h-desc", err("description"))} />
      </Field>
      <Field label="Amenities" htmlFor="h-amen" error={errors.amenities?.message ?? errors.amenities?.root?.message}>
        <Controller
          control={form.control}
          name="amenities"
          render={({ field }) => <AmenitiesInput id="h-amen" value={field.value ?? []} onChange={field.onChange} invalid={!!errors.amenities} />}
        />
      </Field>

      <details className="group rounded-lg border border-line px-3.5 py-2.5 [&[open]]:pb-4" open={isEdit || undefined}>
        <summary className="cursor-pointer text-sm font-medium select-none">More details</summary>
        <div className="mt-3.5 grid grid-cols-2 gap-3">
          <Field label="Check-in from" htmlFor="h-in" error={err("checkInTime")}>
            <Input id="h-in" type="time" {...form.register("checkInTime")} {...invalidProps("h-in", err("checkInTime"))} />
          </Field>
          <Field label="Check-out by" htmlFor="h-out" error={err("checkOutTime")}>
            <Input id="h-out" type="time" {...form.register("checkOutTime")} {...invalidProps("h-out", err("checkOutTime"))} />
          </Field>
          <Field
            label="Free cancellation (hours before arrival)"
            htmlFor="h-cancel"
            error={err("freeCancellationHours")}
            className="col-span-2"
          >
            <Input
              id="h-cancel"
              type="number"
              min={0}
              max={720}
              step={1}
              {...form.register("freeCancellationHours", num)}
              {...invalidProps("h-cancel", err("freeCancellationHours"))}
            />
          </Field>
        </div>
      </details>

      {!isEdit && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <h3 className="text-sm font-semibold">Photos</h3>
          <PhotoPicker
            value={photos}
            onChange={(next) => {
              setPhotos(next);
              setPhotoError(null);
            }}
          />
        </div>
      )}

      {photoError && (
        <p role="alert" className="rounded-lg bg-red-bg px-3 py-2.5 text-[13px] text-red-fg">
          {photoError}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {hotel ? (
          <>
            <Button
              variant="outline"
              size="md"
              isLoading={submitting === (hotel.status === "published" ? "hidden" : "published")}
              disabled={isBusy}
              onClick={submit(hotel.status === "published" ? "hidden" : "published")}
            >
              {hotel.status === "published" ? "Save and hide" : "Save and publish"}
            </Button>
            <Button size="md" isLoading={submitting === "save"} disabled={isBusy} onClick={submit("save")}>
              Save changes
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="md" isLoading={submitting === "hidden"} disabled={isBusy} onClick={submit("hidden")}>
              Save as hidden
            </Button>
            <Button size="md" isLoading={submitting === "published"} disabled={isBusy} onClick={submit("published")}>
              Publish hotel
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
