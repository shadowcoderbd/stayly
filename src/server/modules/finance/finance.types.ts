import "server-only";
import type { z } from "zod";
import type { Period } from "@/lib/domain/period";
import type { Page } from "@/types/api";
import type { periodQuerySchema, transactionsQuerySchema } from "./finance.schema";

// Request and response DTOs. Client code may `import type` from here.

export type { Period };

export type PeriodQuery = z.output<typeof periodQuerySchema>;
export type TransactionsQuery = z.output<typeof transactionsQuerySchema>;

export type FinanceSummary = {
  period: Period;
  confirmedRevenueCents: number;
  approvedBookings: number;
  awaitingCents: number;
  pendingRequests: number;
  refundedCents: number;
  cancellations: number;
  averageBookingCents: number;
  byMonth: { month: string; netCents: number }[];
  byHotel: { hotelId: string; hotelName: string; bookings: number; netCents: number }[];
};

export type FinanceTransaction = {
  id: string;
  createdAt: string;
  type: "payment" | "refund";
  amountCents: number;
  ref: string;
  guestName: string;
  guestEmail: string;
  hotelName: string;
};
export type FinanceTransactionPage = Page<FinanceTransaction> & { period: Period };
