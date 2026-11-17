import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/features/auth";
import { hydrateSession } from "@/features/auth/server";
import { getServerQueryClient } from "@/lib/query/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const queryClient = getServerQueryClient();
  const session = await hydrateSession(queryClient);

  if (!session) redirect("/login?redirectTo=/admin/bookings");
  if (session.user.role !== "admin") redirect("/");

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex min-h-dvh flex-col">
        <AdminHeader />
        {children}
      </div>
    </HydrationBoundary>
  );
}
