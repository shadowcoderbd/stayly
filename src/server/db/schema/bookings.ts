import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { hotel } from "./catalog";
import { timestamps } from "./columns";

export const bookingStatus = pgEnum("booking_status", ["pending", "approved", "rejected", "cancelled"]);
export const transactionType = pgEnum("transaction_type", ["payment", "refund"]);

export const bookingRefSeq = pgSequence("booking_ref_seq", { startWith: 1000 });

export const booking = pgTable(
  "booking",
  {
    id: uuid().primaryKey().defaultRandom(),
    ref: text()
      .notNull()
      .unique()
      .default(sql`'HB-' || nextval('booking_ref_seq')`),
    userId: text()
      .notNull()
      .references(() => user.id),
    hotelId: uuid()
      .notNull()
      .references(() => hotel.id),
    checkIn: date({ mode: "string" }).notNull(),
    checkOut: date({ mode: "string" }).notNull(),
    nights: integer().notNull(),
    guests: integer().notNull(),
    nightlyRateCents: integer().notNull(),
    subtotalCents: integer().notNull(),
    taxCents: integer().notNull(),
    totalCents: integer().notNull(),
    status: bookingStatus().notNull().default("pending"),
    rejectionReason: text(),
    decidedBy: text().references(() => user.id),
    decidedAt: timestamp({ withTimezone: true }),
    cancelledAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index().on(t.hotelId, t.status, t.checkIn, t.checkOut),
    index().on(t.userId, t.createdAt.desc()),
    index().on(t.status, t.createdAt.desc()),
    check("booking_dates", sql`${t.checkOut} > ${t.checkIn}`),
    check("booking_guests", sql`${t.guests} between 1 and 4`),
  ],
);

export const transaction = pgTable(
  "transaction",
  {
    id: uuid().primaryKey().defaultRandom(),
    bookingId: uuid()
      .notNull()
      .references(() => booking.id),
    type: transactionType().notNull(),
    amountCents: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index().on(t.createdAt),
    // One payment and at most one refund per booking: makes approve/cancel idempotent.
    uniqueIndex("transaction_booking_type_unique").on(t.bookingId, t.type),
    check("transaction_amount_positive", sql`${t.amountCents} > 0`),
  ],
);

export const review = pgTable(
  "review",
  {
    id: uuid().primaryKey().defaultRandom(),
    hotelId: uuid()
      .notNull()
      .references(() => hotel.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id),
    bookingId: uuid()
      .unique()
      .references(() => booking.id),
    rating: integer().notNull(),
    comment: text().notNull().default(""),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.hotelId), check("review_rating_range", sql`${t.rating} between 1 and 5`)],
);
