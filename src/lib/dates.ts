import { z } from "zod";

// Calendar-date helpers for "YYYY-MM-DD" strings. Pure and isomorphic.

const DAY_MS = 86_400_000;

export const MAX_NIGHTS = 30;

export const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / DAY_MS);
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/* ───────── Stay validation shared by forms, route handlers and services ───────── */


export const daySchema = z.string().refine(isDay, "Use a YYYY-MM-DD date.");

/** Order and length of a stay. "Not in the past" needs the app time zone, so services check that. */
export function refineStay(v: { checkIn: string; checkOut: string }, ctx: z.RefinementCtx) {
  const n = nightsBetween(v.checkIn, v.checkOut);
  if (n < 1) ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Check-out must be after check-in." });
  else if (n > MAX_NIGHTS) ctx.addIssue({ code: "custom", path: ["checkOut"], message: `Stays are limited to ${MAX_NIGHTS} nights.` });
}

export const stayRangeSchema = z.object({ checkIn: daySchema, checkOut: daySchema }).superRefine(refineStay);
