import { sql } from "drizzle-orm";
import { check, index, integer, numeric, pgEnum, pgTable, text, time, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./columns";

export const hotelStatus = pgEnum("hotel_status", ["published", "hidden"]);

export const hotel = pgTable(
  "hotel",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    city: text().notNull(),
    country: text().notNull(),
    description: text().notNull().default(""),
    amenities: text().array().notNull().default(sql`'{}'::text[]`),
    rooms: integer().notNull(),
    nightlyRateCents: integer().notNull(),
    checkInTime: time().notNull().default("15:00"),
    checkOutTime: time().notNull().default("11:00"),
    freeCancellationHours: integer().notNull().default(48),
    status: hotelStatus().notNull().default("hidden"),
    ratingAvg: numeric({ precision: 2, scale: 1, mode: "number" }),
    reviewCount: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index().on(t.status, t.city),
    check("hotel_rooms_positive", sql`${t.rooms} >= 1`),
    check("hotel_rate_min", sql`${t.nightlyRateCents} >= 100`),
  ],
);

export const hotelImage = pgTable(
  "hotel_image",
  {
    id: uuid().primaryKey().defaultRandom(),
    hotelId: uuid()
      .notNull()
      .references(() => hotel.id, { onDelete: "cascade" }),
    path: text().notNull(),
    alt: text().notNull().default(""),
    position: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.hotelId, t.position)],
);

/** Optional city photo for "Trending destinations". Falls back to a hotel cover. */
export const destination = pgTable("destination", {
  city: text().primaryKey(),
  imagePath: text().notNull(),
});
