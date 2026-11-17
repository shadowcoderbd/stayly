import { z } from "zod";

// Booking rules shared by client and server. Pure and isomorphic.

export const MAX_GUESTS = 4;
export const BOOKING_TABS = ["all", "pending", "approved", "rejected"] as const;
export const ADMIN_BOOKING_TABS = ["pending", "approved", "rejected", "all"] as const;

export const rejectionReasonSchema = z
  .string()
  .trim()
  .min(5, "Give a reason of at least 5 characters.")
  .max(300, "Keep the reason under 300 characters.");

/** A booking that was approved at some point has a receipt (approved, or cancelled after approval). */
export const hasReceipt = (b: { status: string; decidedAt: string | null }) =>
  b.status === "approved" || (b.status === "cancelled" && b.decidedAt !== null);
