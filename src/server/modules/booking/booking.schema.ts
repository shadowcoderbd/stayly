import "server-only";
import { z } from "zod";
import { daySchema, refineStay } from "@/lib/dates";
import { ADMIN_BOOKING_TABS, BOOKING_TABS, MAX_GUESTS, rejectionReasonSchema } from "@/lib/domain/booking";

// Request schemas for /api/v1/bookings and /api/v1/admin/bookings. Types live in booking.types.ts.

export const bookingIdSchema = z.uuid("Invalid booking id.");
export const bookingRefSchema = z.string().regex(/^HB-\d+$/, "Invalid booking reference.");

export const createBookingSchema = z
  .object({
    hotelId: z.uuid(),
    checkIn: daySchema,
    checkOut: daySchema,
    guests: z
      .number({ error: "Choose the number of guests." })
      .int()
      .min(1, "At least 1 guest.")
      .max(MAX_GUESTS, `At most ${MAX_GUESTS} guests per room.`),
  })
  .superRefine(refineStay);

export const myBookingsQuerySchema = z.object({
  status: z.enum(BOOKING_TABS).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const adminBookingsQuerySchema = z.object({
  status: z.enum(ADMIN_BOOKING_TABS).default("pending"),
  hotelId: z.union([z.uuid(), z.literal("")]).default(""),
  search: z.string().trim().max(80).default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const rejectBookingSchema = z.object({ reason: rejectionReasonSchema });
