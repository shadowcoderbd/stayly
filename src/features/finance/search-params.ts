import { createLoader, parseAsInteger, parseAsString, type inferParserType } from "nuqs/server";
import { MAX_PERIOD_MONTHS, monthsIn } from "@/lib/domain/period";
import type { PeriodQuery, TransactionsQuery } from "@/server/modules/finance/finance.types";

/** Period (from/to months, empty = the default last 6 months) and the transactions page (spec F-13). */
export const financeParsers = {
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};

export const loadFinanceParams = createLoader(financeParsers);
export type FinanceParams = inferParserType<typeof financeParsers>;
export const TRANSACTIONS_PER_PAGE = 20;

const isMonth = (v: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

/** A usable period or the default: both months valid, in order and at most 24 months apart. */
export function toPeriodQuery(p: FinanceParams): PeriodQuery {
  const ok = isMonth(p.from) && isMonth(p.to) && p.from <= p.to && monthsIn(p).length <= MAX_PERIOD_MONTHS;
  return ok ? { from: p.from, to: p.to } : { from: "", to: "" };
}

export const toTransactionsQuery = (p: FinanceParams): TransactionsQuery => ({
  ...toPeriodQuery(p),
  page: Math.max(1, p.page),
  limit: TRANSACTIONS_PER_PAGE,
});
