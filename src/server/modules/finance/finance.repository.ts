import "server-only";
import { desc, eq, sql, type SQL } from "drizzle-orm";
import { addMonths, type Period } from "@/lib/domain/period";
import { serverEnv } from "@/server/config/env";
import { db } from "@/server/db/client";
import { booking, hotel, transaction, user } from "@/server/db/schema";

// Aggregates over the transaction ledger. Months are calendar months in APP_TIMEZONE.

const localTs = sql`(${transaction.createdAt} at time zone ${serverEnv.APP_TIMEZONE})`;
const inPeriod = (p: Period) =>
  sql`${localTs} >= ${`${p.from}-01`}::timestamp and ${localTs} < ${`${addMonths(p.to, 1)}-01`}::timestamp`;

const signed = sql<number>`case when ${transaction.type} = 'refund' then -${transaction.amountCents} else ${transaction.amountCents} end`;
const sumInt = (expr: SQL) => sql<number>`coalesce(sum(${expr}), 0)::int`;

export async function ledgerTotals(p: Period) {
  const [row] = await db
    .select({
      paymentsCents: sql<number>`coalesce(sum(${transaction.amountCents}) filter (where ${transaction.type} = 'payment'), 0)::int`,
      paymentsCount: sql<number>`count(*) filter (where ${transaction.type} = 'payment')::int`,
      refundsCents: sql<number>`coalesce(sum(${transaction.amountCents}) filter (where ${transaction.type} = 'refund'), 0)::int`,
      refundsCount: sql<number>`count(*) filter (where ${transaction.type} = 'refund')::int`,
    })
    .from(transaction)
    .where(inPeriod(p));
  return {
    paymentsCents: Number(row?.paymentsCents ?? 0),
    paymentsCount: Number(row?.paymentsCount ?? 0),
    refundsCents: Number(row?.refundsCents ?? 0),
    refundsCount: Number(row?.refundsCount ?? 0),
  };
}

/** Value and number of requests still waiting for a decision (any date). */
export async function pendingTotals() {
  const [row] = await db
    .select({ cents: sumInt(sql`${booking.totalCents}`), count: sql<number>`count(*)::int` })
    .from(booking)
    .where(eq(booking.status, "pending"));
  return { cents: Number(row?.cents ?? 0), count: Number(row?.count ?? 0) };
}

/** Net cents per "YYYY-MM" month that has transactions. */
export async function netByMonth(p: Period): Promise<Map<string, number>> {
  const monthKey = sql<string>`to_char(${localTs}, 'YYYY-MM')`;
  const rows = await db
    .select({ month: monthKey, netCents: sumInt(signed) })
    .from(transaction)
    .where(inPeriod(p))
    // Group by position: the time-zone parameter would otherwise make SELECT and GROUP BY differ.
    .groupBy(sql`1`);
  return new Map(rows.map((r) => [r.month, Number(r.netCents)]));
}

export async function netByHotel(p: Period) {
  const net = sumInt(signed);
  const rows = await db
    .select({
      hotelId: hotel.id,
      hotelName: hotel.name,
      bookings: sql<number>`count(*) filter (where ${transaction.type} = 'payment')::int`,
      netCents: net,
    })
    .from(transaction)
    .innerJoin(booking, eq(booking.id, transaction.bookingId))
    .innerJoin(hotel, eq(hotel.id, booking.hotelId))
    .where(inPeriod(p))
    .groupBy(hotel.id, hotel.name)
    .orderBy(desc(net), hotel.name);
  return rows.map((r) => ({ ...r, bookings: Number(r.bookings), netCents: Number(r.netCents) }));
}

/** Transactions with their booking, guest and hotel, newest first. Omit `page` for all of them. */
export async function listTransactions(p: Period, page?: { limit: number; offset: number }) {
  const q = db
    .select({
      id: transaction.id,
      createdAt: transaction.createdAt,
      type: transaction.type,
      amountCents: transaction.amountCents,
      ref: booking.ref,
      guestName: user.name,
      guestEmail: user.email,
      hotelName: hotel.name,
    })
    .from(transaction)
    .innerJoin(booking, eq(booking.id, transaction.bookingId))
    .innerJoin(hotel, eq(hotel.id, booking.hotelId))
    .innerJoin(user, eq(user.id, booking.userId))
    .where(inPeriod(p))
    .orderBy(desc(transaction.createdAt));
  return page ? q.limit(page.limit).offset(page.offset) : q;
}

export async function countTransactions(p: Period) {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(transaction).where(inPeriod(p));
  return Number(row?.n ?? 0);
}
