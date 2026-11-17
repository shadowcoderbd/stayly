import "server-only";
import { and, asc, count, desc, eq, ilike, like, max, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db, type DbOrTx } from "@/server/db/client";
import { booking, hotel, hotelImage } from "@/server/db/schema";
import { publicUrl } from "@/server/lib/storage";
import type { AdminHotelRow, HotelCard, HotelDetail, HotelImage, HotelOption, HotelStatus, Location, TrendingHotel } from "./hotel.types";

// Database access for hotels. No business rules and no AppErrors: missing rows come back as null.

/* ───────── Shared SQL fragments (also used by the booking repository) ───────── */

type SqlValue<T> = AnyPgColumn | SQL | T;

/**
 * Fully-qualified refs for correlated subqueries. Drizzle drops the table name on
 * single-table selects, and an unqualified "id" would bind to the subquery's own table (architecture.md §8.4).
 */
export const hotelRef = { id: sql`"hotel"."id"`, rooms: sql`"hotel"."rooms"` };

/**
 * Rooms left for [checkIn, checkOut) given the hotel's room count:
 * rooms − (max number of APPROVED bookings covering any single night in the range).
 * Pending requests do not hold rooms (spec §4.8).
 */
export function roomsLeftSql(
  hotelId: SqlValue<string>,
  rooms: SqlValue<number>,
  checkIn: SqlValue<string>,
  checkOut: SqlValue<string>,
) {
  return sql<number>`(${rooms} - coalesce((
    select max(n) from (
      select count(b.id) as n
      from generate_series(${checkIn}::date, ${checkOut}::date - 1, interval '1 day') as d(day)
      left join booking b
        on b.hotel_id = ${hotelId}
       and b.status = 'approved'
       and b.check_in <= d.day::date
       and b.check_out > d.day::date
      group by d.day
    ) nights
  ), 0))::int`;
}

const coverPath = sql<string | null>`(select hi.path from ${hotelImage} hi where hi.hotel_id = ${hotelRef.id} order by hi.position asc, hi.created_at asc limit 1)`;
const coverAlt = sql<string | null>`(select hi.alt from ${hotelImage} hi where hi.hotel_id = ${hotelRef.id} order by hi.position asc, hi.created_at asc limit 1)`;

export const cardColumns = {
  id: hotel.id,
  slug: hotel.slug,
  name: hotel.name,
  city: hotel.city,
  country: hotel.country,
  nightlyRateCents: hotel.nightlyRateCents,
  ratingAvg: hotel.ratingAvg,
  reviewCount: hotel.reviewCount,
  status: hotel.status,
  coverPath,
  coverAlt,
};

export type CardRow = { coverPath: string | null; coverAlt: string | null } & Omit<HotelCard, "cover">;

export function toCard({ coverPath, coverAlt, ...row }: CardRow): HotelCard {
  return {
    ...row,
    ratingAvg: row.ratingAvg === null ? null : Number(row.ratingAvg),
    cover: coverPath ? { url: publicUrl(coverPath), alt: coverAlt || row.name } : null,
  };
}

const published = eq(hotel.status, "published");
const likeTerm = (s: string) => `%${s.replace(/[%_\\]/g, "\\$&")}%`;
const hhmm = (t: string) => t.slice(0, 5);

/* ───────── Availability ───────── */

export async function roomsLeft(dbx: DbOrTx, hotelId: string, rooms: number, checkIn: string, checkOut: string) {
  const res = await dbx.execute<{ left: number }>(sql`select ${roomsLeftSql(hotelId, rooms, checkIn, checkOut)} as left`);
  return Number(res.rows[0]?.left ?? 0);
}

/** Highest number of approved bookings on any future night (from `from` on). */
export async function peakFutureOccupancy(dbx: DbOrTx, hotelId: string, from: string) {
  const res = await dbx.execute<{ day: string; n: number }>(sql`
    select d.day::date::text as day, count(b.id)::int as n
    from booking b
    cross join lateral generate_series(greatest(b.check_in, ${from}::date), b.check_out - 1, interval '1 day') as d(day)
    where b.hotel_id = ${hotelId} and b.status = 'approved' and b.check_out > ${from}::date
    group by d.day
    order by n desc, d.day asc
    limit 1`);
  const row = res.rows[0];
  return row ? { day: row.day, count: Number(row.n) } : null;
}

/* ───────── Public reads ───────── */

export async function search(p: {
  q: string;
  location: string;
  stay: { checkIn: string; checkOut: string } | null;
  page: number;
  limit: number;
}): Promise<{ items: HotelCard[]; total: number }> {
  const where: SQL[] = [published];
  if (p.q) where.push(ilike(hotel.name, likeTerm(p.q)));
  if (p.location) where.push(eq(hotel.city, p.location));
  if (p.stay) where.push(sql`${roomsLeftSql(hotelRef.id, hotelRef.rooms, p.stay.checkIn, p.stay.checkOut)} > 0`);

  const filter = and(...where);
  const [rows, [total]] = await Promise.all([
    db
      .select(cardColumns)
      .from(hotel)
      .where(filter)
      .orderBy(sql`${hotel.ratingAvg} desc nulls last`, asc(hotel.name))
      .limit(p.limit)
      .offset((p.page - 1) * p.limit),
    db.select({ n: sql<number>`count(*)::int` }).from(hotel).where(filter),
  ]);
  return { items: rows.map(toCard), total: total?.n ?? 0 };
}

export async function topRated(limit: number): Promise<HotelCard[]> {
  const rows = await db
    .select(cardColumns)
    .from(hotel)
    .where(and(published, sql`${hotel.ratingAvg} is not null`))
    .orderBy(desc(hotel.ratingAvg), desc(hotel.reviewCount), asc(hotel.name))
    .limit(limit);
  return rows.map(toCard);
}

/** Hotels with the most booking requests in the last 7 days. */
export async function mostRequestedThisWeek(limit: number): Promise<TrendingHotel[]> {
  const requests = sql<number>`count(${booking.id})::int`;
  const rows = await db
    .select({ ...cardColumns, bookedThisWeek: requests })
    .from(hotel)
    .innerJoin(booking, and(eq(booking.hotelId, hotel.id), sql`${booking.createdAt} >= now() - interval '7 days'`))
    .where(published)
    .groupBy(hotel.id)
    .orderBy(desc(requests), asc(hotel.name))
    .limit(limit);
  return rows.map(({ bookedThisWeek, ...r }) => ({ ...toCard(r), bookedThisWeek }));
}

export type CityStats = {
  city: string;
  country: string;
  hotelCount: number;
  /** Requests in the last 30 days, and in the 30 days before that. */
  requestsCur: number;
  requestsPrev: number;
  imageUrl: string | null;
};

/** Every city with published hotels, with its request counts and a cover image. */
export async function cityStats(): Promise<CityStats[]> {
  const res = await db.execute<{
    city: string;
    country: string;
    hotel_count: number;
    cur: number;
    prev: number;
    image_path: string | null;
  }>(sql`
    with cities as (
      select h.city, min(h.country) as country, count(*)::int as hotel_count
      from hotel h where h.status = 'published' group by h.city
    ),
    reqs as (
      select h.city,
        count(*) filter (where b.created_at >= now() - interval '30 days')::int as cur,
        count(*) filter (where b.created_at < now() - interval '30 days' and b.created_at >= now() - interval '60 days')::int as prev
      from booking b join hotel h on h.id = b.hotel_id
      where h.status = 'published'
      group by h.city
    )
    select c.city, c.country, c.hotel_count, coalesce(r.cur, 0) as cur, coalesce(r.prev, 0) as prev,
      coalesce(
        (select d.image_path from destination d where d.city = c.city),
        (select hi.path from hotel h join hotel_image hi on hi.hotel_id = h.id
          where h.city = c.city and h.status = 'published'
          order by h.rating_avg desc nulls last, hi.position asc limit 1)
      ) as image_path
    from cities c left join reqs r on r.city = c.city`);

  return res.rows.map((r) => ({
    city: r.city,
    country: r.country,
    hotelCount: Number(r.hotel_count),
    requestsCur: Number(r.cur),
    requestsPrev: Number(r.prev),
    imageUrl: r.image_path ? publicUrl(r.image_path) : null,
  }));
}

export async function locations(): Promise<Location[]> {
  return db.selectDistinct({ city: hotel.city, country: hotel.country }).from(hotel).where(published).orderBy(asc(hotel.city));
}

export async function listImages(dbx: DbOrTx, hotelId: string): Promise<HotelImage[]> {
  const rows = await dbx
    .select()
    .from(hotelImage)
    .where(eq(hotelImage.hotelId, hotelId))
    .orderBy(asc(hotelImage.position), asc(hotelImage.createdAt));
  return rows.map((r) => ({ id: r.id, url: publicUrl(r.path), alt: r.alt, position: r.position }));
}

/** One hotel with its images, or null. Without `includeHidden`, only published hotels match. */
export async function findDetail(
  by: { slug: string } | { id: string },
  opts: { includeHidden?: boolean } = {},
): Promise<Omit<HotelDetail, "taxRate"> | null> {
  const match = "slug" in by ? eq(hotel.slug, by.slug) : eq(hotel.id, by.id);
  const [row] = await db
    .select({
      ...cardColumns,
      description: hotel.description,
      amenities: hotel.amenities,
      rooms: hotel.rooms,
      checkInTime: hotel.checkInTime,
      checkOutTime: hotel.checkOutTime,
      freeCancellationHours: hotel.freeCancellationHours,
    })
    .from(hotel)
    .where(opts.includeHidden ? match : and(match, published))
    .limit(1);
  if (!row) return null;
  const { description, amenities, rooms, checkInTime, checkOutTime, freeCancellationHours, ...card } = row;
  return {
    ...toCard(card),
    description,
    amenities,
    rooms,
    checkInTime: hhmm(checkInTime),
    checkOutTime: hhmm(checkOutTime),
    freeCancellationHours,
    images: await listImages(db, row.id),
  };
}

/** What a booking needs from a published hotel. */
export async function findBookable(dbx: DbOrTx, id: string) {
  const [row] = await dbx
    .select({ id: hotel.id, name: hotel.name, rooms: hotel.rooms, nightlyRateCents: hotel.nightlyRateCents })
    .from(hotel)
    .where(and(eq(hotel.id, id), published))
    .limit(1);
  return row ?? null;
}

/** Locks the hotel row (FOR UPDATE) and returns its room count. */
export async function lockRooms(tx: DbOrTx, id: string) {
  const [row] = await tx.select({ rooms: hotel.rooms }).from(hotel).where(eq(hotel.id, id)).for("update");
  return row?.rooms ?? null;
}

/* ───────── Admin ───────── */

export async function listAll(p: {
  q: string;
  status: HotelStatus | "all";
  page: number;
  limit: number;
}): Promise<{ items: AdminHotelRow[]; total: number }> {
  const conds: SQL[] = [];
  if (p.status !== "all") conds.push(eq(hotel.status, p.status));
  if (p.q) conds.push(ilike(hotel.name, likeTerm(p.q)));
  const where = and(...conds);
  const [rows, [total]] = await Promise.all([
    db
      .select({ ...cardColumns, rooms: hotel.rooms })
      .from(hotel)
      .where(where)
      .orderBy(asc(hotel.name))
      .limit(p.limit)
      .offset((p.page - 1) * p.limit),
    db.select({ n: count() }).from(hotel).where(where),
  ]);
  return { items: rows.map(({ rooms, ...r }) => ({ ...toCard(r), rooms })), total: total?.n ?? 0 };
}

export async function findById(id: string) {
  const [row] = await db.select().from(hotel).where(eq(hotel.id, id)).limit(1);
  return row ?? null;
}

/** Slugs equal to `base` or starting with `base-`. */
export async function slugsLike(base: string): Promise<string[]> {
  const rows = await db
    .select({ slug: hotel.slug })
    .from(hotel)
    .where(or(eq(hotel.slug, base), like(hotel.slug, `${base}-%`)));
  return rows.map((r) => r.slug);
}

export async function insert(values: typeof hotel.$inferInsert): Promise<string> {
  const [row] = await db.insert(hotel).values(values).returning({ id: hotel.id });
  return row!.id;
}

export async function update(id: string, values: Partial<typeof hotel.$inferInsert>) {
  await db.update(hotel).set(values).where(eq(hotel.id, id));
}

export async function options(): Promise<HotelOption[]> {
  return db.select({ id: hotel.id, name: hotel.name }).from(hotel).orderBy(asc(hotel.name));
}

/* ───────── Images ───────── */

export async function countImages(hotelId: string) {
  const [row] = await db.select({ n: count() }).from(hotelImage).where(eq(hotelImage.hotelId, hotelId));
  return row?.n ?? 0;
}

export async function nextImagePosition(hotelId: string) {
  const [row] = await db.select({ p: max(hotelImage.position) }).from(hotelImage).where(eq(hotelImage.hotelId, hotelId));
  return (row?.p ?? -1) + 1;
}

export async function insertImage(values: typeof hotelImage.$inferInsert) {
  await db.insert(hotelImage).values(values);
}

export async function findImage(hotelId: string, imageId: string) {
  const [row] = await db
    .select()
    .from(hotelImage)
    .where(and(eq(hotelImage.id, imageId), eq(hotelImage.hotelId, hotelId)))
    .limit(1);
  return row ?? null;
}

/** Sets position (array order) and alt text in one transaction. */
export async function arrangeImages(hotelId: string, images: { id: string; alt: string }[]) {
  await db.transaction(async (tx) => {
    for (const [position, img] of images.entries())
      await tx
        .update(hotelImage)
        .set({ position, alt: img.alt })
        .where(and(eq(hotelImage.id, img.id), eq(hotelImage.hotelId, hotelId)));
  });
}

export async function deleteImage(imageId: string) {
  await db.delete(hotelImage).where(eq(hotelImage.id, imageId));
}
