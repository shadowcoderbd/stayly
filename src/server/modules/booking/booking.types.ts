import "server-only";
import type { z } from "zod";
import type { HotelCard } from "@/server/modules/hotel/hotel.types";
import type { Page } from "@/types/api";
import type { adminBookingsQuerySchema, createBookingSchema, myBookingsQuerySchema, rejectBookingSchema } from "./booking.schema";

// Request and response DTOs. Client code may `import type` from here.

/* ───────── Requests ───────── */

export type CreateBookingInput = z.output<typeof createBookingSchema>;
export type MyBookingsQuery = z.output<typeof myBookingsQuerySchema>;
export type AdminBookingsQuery = z.output<typeof adminBookingsQuerySchema>;
export type RejectBookingInput = z.output<typeof rejectBookingSchema>;

/* ───────── Responses ───────── */

export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

export type Booking = {
  id: string;
  ref: string;
  status: BookingStatus;
  isCompleted: boolean;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  nightlyRateCents: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  rejectionReason: string | null;
  createdAt: string;
  decidedAt: string | null;
  cancelledAt: string | null;
  /** When an approved booking stops being cancellable (free-cancellation cutoff). */
  cancelDeadline: string;
  canCancel: boolean;
  hotel: Pick<HotelCard, "id" | "slug" | "name" | "city" | "country" | "cover">;
};
export type BookingPage = Page<Booking>;

export type Transaction = { id: string; type: "payment" | "refund"; amountCents: number; createdAt: string };

export type BookingDetail = Booking & { transactions: Transaction[] };

export type BookingCounts = { all: number; pending: number; approved: number; rejected: number; cancelled: number };

export type AdminBooking = Booking & {
  guest: { id: string; name: string; email: string };
  /** Rooms left for these dates; only computed for pending rows. */
  roomsLeft: number | null;
};
export type AdminBookingPage = Page<AdminBooking>;

export type CreatedBooking = { id: string; ref: string };
export type BookingDecision = { id: string; ref: string; status: "approved" | "rejected" };
export type CancelResult = { id: string; ref: string; status: "cancelled"; refundCents: number };
