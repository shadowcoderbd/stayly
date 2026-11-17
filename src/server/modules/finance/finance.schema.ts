import "server-only";
import { z } from "zod";
import { MAX_PERIOD_MONTHS, monthsIn } from "@/lib/domain/period";

// Request schemas for /api/v1/admin/finance. Types live in finance.types.ts.

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM.");
const optionalMonth = z.union([month, z.literal("")]).default("");

/** `from`/`to` are optional; the service fills in the default period (it needs the app time zone). */
const periodFields = z.object({ from: optionalMonth, to: optionalMonth });

const refinePeriod = (p: { from: string; to: string }, ctx: z.RefinementCtx) => {
  if (!p.from || !p.to) return;
  if (p.from > p.to) ctx.addIssue({ code: "custom", path: ["from"], message: "`from` must be on or before `to`." });
  else if (monthsIn(p).length > MAX_PERIOD_MONTHS)
    ctx.addIssue({ code: "custom", path: ["to"], message: `Pick a range of ${MAX_PERIOD_MONTHS} months or less.` });
};

export const periodQuerySchema = periodFields.superRefine(refinePeriod);

export const transactionsQuerySchema = periodFields
  .extend({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .superRefine(refinePeriod);
