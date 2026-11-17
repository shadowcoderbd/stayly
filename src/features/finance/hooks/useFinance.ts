import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { financeQueries } from "../queries";
import { financeParsers, toPeriodQuery, toTransactionsQuery } from "../search-params";

export function useFinance() {
  const [params, setParams] = useQueryStates(financeParsers, { scroll: false });
  const period = toPeriodQuery(params);
  const summary = useQuery(financeQueries.summary(period));
  const transactions = useQuery(financeQueries.transactions(toTransactionsQuery(params)));

  return {
    period,
    summary: summary.data,
    isSummaryLoading: summary.isPending,
    transactions: transactions.data?.items ?? [],
    pagination: transactions.data?.pagination,
    isFetching: summary.isFetching || transactions.isFetching,
    setPeriod: (from: string, to: string) => setParams({ from, to, page: 1 }),
    setPage: (page: number) => setParams({ page }),
  };
}
