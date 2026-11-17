import "server-only";
import { z } from "zod";
import { daySchema as day, refineStay, stayRangeSchema } from "@/lib/dates";
import { HOTEL_STATUS_TABS, hotelFields } from "@/lib/domain/hotel";

// Request schemas for /api/v1/hotels and /api/v1/admin/hotels. Types live in hotel.types.ts.

export const hotelIdSchema = z.uuid("Invalid hotel id.");
export const imageIdSchema = z.uuid("Invalid photo id.");

/** Browse / search (spec F-03). The service re-checks rules that need "today". */
export const hotelListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(48).default(12),
    q: z.string().trim().max(80).default(""),
    location: z.string().trim().max(80).default(""),
    checkIn: z.union([day, z.literal("")]).default(""),
    checkOut: z.union([day, z.literal("")]).default(""),
  })
  .superRefine((v, ctx) => {
    if (!!v.checkIn !== !!v.checkOut)
      ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Pick both check-in and check-out." });
    else if (v.checkIn) refineStay(v, ctx);
  });

export const limitQuerySchema = (fallback: number) =>
  z.object({ limit: z.coerce.number().int().min(1).max(20).default(fallback) });

export const availabilityQuerySchema = stayRangeSchema;

/* ───────── Admin ───────── */

export const hotelInputSchema = z.object(hotelFields);
export const hotelPatchSchema = hotelInputSchema.partial();

export const adminHotelsQuerySchema = z.object({
  q: z.string().trim().max(80).default(""),
  status: z.enum(HOTEL_STATUS_TABS).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const arrangeImagesSchema = z.object({
  images: z.array(z.object({ id: z.uuid(), alt: z.string().trim().max(160).default("") })).min(1),
});
