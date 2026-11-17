import { z } from "zod";
import { hotelFields } from "@/lib/domain/hotel";
import type { HotelInput, HotelStatus } from "@/server/modules/hotel/hotel.types";

/* ───────── The admin form (spec F-11): dollars in the UI, cents on the wire ───────── */

export const hotelFormSchema = z.object(hotelFields).omit({ nightlyRateCents: true, status: true }).extend({
  rate: z
    .number({ error: "Enter a nightly rate." })
    .min(1, "Rate must be at least $1.")
    .max(100_000, "Rate must be at most $100,000."),
  rooms: z.number({ error: "Enter the number of rooms." }).int("Use a whole number.").min(1, "At least 1 room.").max(5000),
  freeCancellationHours: z
    .number({ error: "Enter hours between 0 and 720." })
    .int("Use a whole number.")
    .min(0, "Use 0 or more hours.")
    .max(720, "At most 720 hours (30 days)."),
});
export type HotelFormInput = z.input<typeof hotelFormSchema>;
export type HotelFormValues = z.output<typeof hotelFormSchema>;

export const toHotelInput = ({ rate, ...v }: HotelFormValues, status: HotelStatus): HotelInput => ({
  ...v,
  nightlyRateCents: Math.round(rate * 100),
  status,
});
