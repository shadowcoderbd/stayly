import "server-only";
import { serverEnv } from "@/server/config/env";

export type Quote = {
  nights: number;
  nightlyRateCents: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

/** The only source of truth for booking prices (spec F-05). */
export function quote(nightlyRateCents: number, nights: number, taxRate = serverEnv.TAX_RATE): Quote {
  const subtotalCents = nightlyRateCents * nights;
  const taxCents = Math.round(subtotalCents * taxRate);
  return { nights, nightlyRateCents, subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}
