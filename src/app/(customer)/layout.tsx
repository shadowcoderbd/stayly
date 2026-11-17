import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/layout/Page";
import { CustomerHeader } from "@/features/auth";
import { hydrateSession } from "@/features/auth/server";
import { getServerQueryClient } from "@/lib/query/server";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const queryClient = getServerQueryClient();
  const session = await hydrateSession(queryClient);

  // proxy.ts handles the no-cookie case; this also covers expired sessions and admins.
  if (!session) redirect("/login");
  if (session.user.role === "admin") redirect("/admin/bookings");

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
