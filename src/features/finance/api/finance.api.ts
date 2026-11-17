import { http } from "@/lib/http/client";
import { buildQueryString } from "@/lib/query-string";
import type { ApiResponse } from "@/types/api";
import type { FinanceSummary, FinanceTransactionPage, PeriodQuery, TransactionsQuery } from "@/server/modules/finance/finance.types";

const unwrap = <T>(r: { data: ApiResponse<T> }) => r.data.data;

export const financeApi = {
  summary: (period: PeriodQuery) => http.get<ApiResponse<FinanceSummary>>(`/admin/finance/summary${buildQueryString(period)}`).then(unwrap),
  transactions: (query: TransactionsQuery) =>
    http.get<ApiResponse<FinanceTransactionPage>>(`/admin/finance/transactions${buildQueryString(query)}`).then(unwrap),
};

/** A plain link target: the browser downloads it with the session cookie. */
export const csvUrl = (period: PeriodQuery) => `/api/v1/admin/finance/transactions.csv${buildQueryString(period)}`;
