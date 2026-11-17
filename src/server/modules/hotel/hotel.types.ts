import "server-only";
import type { z } from "zod";
import type { Page } from "@/types/api";
import type {
  adminHotelsQuerySchema,
  arrangeImagesSchema,
  hotelInputSchema,
  hotelListQuerySchema,
  hotelPatchSchema,
} from "./hotel.schema";

// Request and response DTOs. Client code may `import type` from here.

/* ───────── Requests ───────── */

export type HotelQuery = z.output<typeof hotelListQuerySchema>;
export type HotelInput = z.output<typeof hotelInputSchema>;
export type HotelPatch = z.output<typeof hotelPatchSchema>;
export type AdminHotelsQuery = z.output<typeof adminHotelsQuerySchema>;
export type ArrangeImagesInput = z.output<typeof arrangeImagesSchema>;

/* ───────── Responses ───────── */

export type HotelStatus = "published" | "hidden";

export type HotelImage = { id: string; url: string; alt: string; position: number };

export type HotelCard = {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  nightlyRateCents: number;
  ratingAvg: number | null;
  reviewCount: number;
  status: HotelStatus;
  cover: { url: string; alt: string } | null;
};

export type HotelPage = Page<HotelCard>;

export type TrendingHotel = HotelCard & { bookedThisWeek: number };

export type HotelDetail = HotelCard & {
  description: string;
  amenities: string[];
  rooms: number;
  checkInTime: string;
  checkOutTime: string;
  freeCancellationHours: number;
  images: HotelImage[];
  /** Tax applied at booking time, so the client estimate matches the server's quote. */
  taxRate: number;
};

export type Destination = { city: string; country: string; hotelCount: number; trendPct: number | null; imageUrl: string | null };

export type Location = { city: string; country: string };

export type Availability = { available: boolean; roomsLeft: number };

export type AdminHotelRow = HotelCard & { rooms: number };
export type AdminHotelPage = Page<AdminHotelRow>;

export type HotelOption = { id: string; name: string };
