import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { financeApi } from "./api/finance.api";
import type { FinanceSummary, FinanceTransactionPage, PeriodQuery, TransactionsQuery } from "@/server/modules/finance/finance.types";

export const financeKeys = {
  all: ["finance"] as const,
  summary: (period: PeriodQuery) => [...financeKeys.all, "summary", period] as const,
  transactions: (query: TransactionsQuery) => [...financeKeys.all, "transactions", query] as const,
};

type Fetch<P, T> = (params: P) => Promise<T>;

export const financeQueries = {
  summary: (period: PeriodQuery, fetcher: Fetch<PeriodQuery, FinanceSummary> = financeApi.summary) =>
    queryOptions({ queryKey: financeKeys.summary(period), queryFn: () => fetcher(period), placeholderData: keepPreviousData }),
  transactions: (query: TransactionsQuery, fetcher: Fetch<TransactionsQuery, FinanceTransactionPage> = financeApi.transactions) =>
    queryOptions({ queryKey: financeKeys.transactions(query), queryFn: () => fetcher(query), placeholderData: keepPreviousData }),
};
