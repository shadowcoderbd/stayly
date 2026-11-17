import { z } from "zod";

// Hotel rules shared by the admin form (client) and the API (server). Pure and isomorphic.

export const MAX_IMAGES = 10;
export const MAX_UPLOAD_MB = 5;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const HOTEL_STATUSES = ["published", "hidden"] as const;
export const HOTEL_STATUS_TABS = ["all", ...HOTEL_STATUSES] as const;

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour).");

/** Field rules of a hotel (spec F-11). The API's create/update body and the admin form both build on these. */
export const hotelFields = {
  name: z.string().trim().min(2, "Name needs at least 2 characters.").max(80, "Keep the name under 80 characters."),
  city: z.string().trim().min(1, "City is required.").max(80),
  country: z.string().trim().min(1, "Country is required.").max(80),
  description: z.string().trim().max(2000, "Keep the description under 2000 characters.").default(""),
  amenities: z.array(z.string().trim().min(1).max(40)).max(30, "At most 30 amenities.").default([]),
  rooms: z.number({ error: "Enter the number of rooms." }).int().min(1, "At least 1 room.").max(5000),
  nightlyRateCents: z.number({ error: "Enter a nightly rate." }).int().min(100, "Rate must be at least $1.").max(10_000_000),
  checkInTime: time.default("15:00"),
  checkOutTime: time.default("11:00"),
  freeCancellationHours: z.number().int().min(0).max(720).default(48),
  status: z.enum(HOTEL_STATUSES).default("hidden"),
};
