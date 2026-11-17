import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { SiteFooter } from "@/components/layout/Page";
import { CustomerHeader } from "@/features/auth";
import { hydrateSession } from "@/features/auth/server";
import { getServerQueryClient } from "@/lib/query/server";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const queryClient = getServerQueryClient();
  await hydrateSession(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex min-h-dvh flex-col">
        <CustomerHeader />
        {children}
        <SiteFooter />
      </div>
    </HydrationBoundary>
  );
}
