import "server-only";
import { defaultPeriod, monthsIn, type Period } from "@/lib/domain/period";
import { today } from "@/server/lib/dates";
import { BadRequestError } from "@/server/lib/errors";
import { toPage } from "@/types/api";
import * as financeRepo from "./finance.repository";
import type { FinanceSummary, FinanceTransactionPage, PeriodQuery, TransactionsQuery } from "./finance.types";

// Finance dashboard (spec F-13).

/** Fills in the default period and checks the range. */
export function resolvePeriod(q: Pick<PeriodQuery, "from" | "to">): Period {
  const d = defaultPeriod(today());
  const p = { from: q.from || d.from, to: q.to || d.to };
  if (p.from > p.to) throw new BadRequestError("from: `from` must be on or before `to`.");
  return p;
}

export async function summary(q: PeriodQuery): Promise<FinanceSummary> {
  const p = resolvePeriod(q);
  const [totals, pending, byMonth, byHotel] = await Promise.all([
    financeRepo.ledgerTotals(p),
    financeRepo.pendingTotals(),
    financeRepo.netByMonth(p),
    financeRepo.netByHotel(p),
  ]);

  return {
    period: p,
    confirmedRevenueCents: totals.paymentsCents - totals.refundsCents,
    approvedBookings: totals.paymentsCount,
    awaitingCents: pending.cents,
    pendingRequests: pending.count,
    refundedCents: totals.refundsCents,
    cancellations: totals.refundsCount,
    averageBookingCents: totals.paymentsCount ? Math.round(totals.paymentsCents / totals.paymentsCount) : 0,
    byMonth: monthsIn(p).map((month) => ({ month, netCents: byMonth.get(month) ?? 0 })),
    byHotel,
  };
}

export async function transactions(q: TransactionsQuery): Promise<FinanceTransactionPage> {
  const p = resolvePeriod(q);
  const [rows, total] = await Promise.all([
    financeRepo.listTransactions(p, { limit: q.limit, offset: (q.page - 1) * q.limit }),
    financeRepo.countTransactions(p),
  ]);
  const items = rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  return { ...toPage(items, { page: q.page, limit: q.limit, totalDocs: total }), period: p };
}

const quote = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
/** User-entered text: neutralize spreadsheet formula injection, then quote. */
const textCell = (v: string) => quote(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

export async function transactionsCsv(q: PeriodQuery): Promise<{ filename: string; csv: string }> {
  const p = resolvePeriod(q);
  const rows = await financeRepo.listTransactions(p);
  const header = ["date", "ref", "guest_name", "guest_email", "hotel", "type", "amount_usd"];
  const lines = rows.map((r) =>
    [
      r.createdAt.toISOString().slice(0, 10),
      r.ref,
      textCell(r.guestName),
      textCell(r.guestEmail),
      textCell(r.hotelName),
      r.type,
      ((r.type === "refund" ? -r.amountCents : r.amountCents) / 100).toFixed(2),
    ].join(","),
  );
  return {
    filename: `stayly-transactions-${p.from}-to-${p.to}.csv`,
    csv: [header.join(","), ...lines].join("\n") + "\n",
  };
}
