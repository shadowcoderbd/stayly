import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

/** The header from the design: logo, (Admin badge), nav, account area. */
export function AppHeader({
  homeHref,
  nav,
  isAdmin = false,
  account,
}: {
  homeHref: string;
  nav: React.ReactNode;
  isAdmin?: boolean;
  account: React.ReactNode;
}) {
  return (
    <header className="no-print border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-1">
          <Link href={homeHref} className="mr-1 text-[17px] font-semibold tracking-tight">
            Stayly
          </Link>
          {isAdmin && <Badge tone="dark">Admin</Badge>}
        </div>
        {nav}
        {account}
      </div>
    </header>
  );
}
