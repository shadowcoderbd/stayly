import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/Page";
import { Finance, financeQueries, loadFinanceParams, toPeriodQuery, toTransactionsQuery } from "@/features/finance";
import * as financeService from "@/server/modules/finance/finance.service";
import { getServerQueryClient } from "@/lib/query/server";

export const metadata: Metadata = { title: "Finance · Admin" };

export default async function FinancePage({ searchParams }: PageProps<"/admin/finance">) {
  const params = await loadFinanceParams(searchParams);
  const queryClient = getServerQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(financeQueries.summary(toPeriodQuery(params), financeService.summary)),
    queryClient.prefetchQuery(financeQueries.transactions(toTransactionsQuery(params), financeService.transactions)),
  ]);

  return (
    <PageContainer className="gap-7">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Finance />
      </HydrationBoundary>
    </PageContainer>
  );
}
