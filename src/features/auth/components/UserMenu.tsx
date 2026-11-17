"use client";

import { ChevronDown, LayoutDashboard, LogOut, Luggage } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { buttonStyles } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { useSignOut } from "../hooks/useAuthMutations";
import { useMe } from "../hooks/useMe";

/** Avatar + name with a menu (signed in), or Sign in / Sign up (signed out). */
export function UserMenu() {
  const { user, isAdmin } = useMe();
  const { signOut, isSigningOut } = useSignOut();
  const pathname = usePathname();

  if (!user) {
    const redirect = pathname === "/" ? "" : `?redirectTo=${encodeURIComponent(pathname)}`;
    return (
      <div className="flex items-center gap-2">
        <Link href={`/login${redirect}`} className={buttonStyles({ variant: "outline", size: "md" })}>
          Sign in
        </Link>
        <Link href={`/signup${redirect}`} className={buttonStyles({ size: "md" })}>
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex cursor-pointer items-center gap-2.5 rounded-lg py-1 pr-1.5 pl-1 text-sm text-muted hover:bg-hover"
        aria-label={`Account menu for ${user.name}`}
      >
        <Avatar name={user.name} />
        <span className="max-w-40 truncate">{user.name}</span>
        <ChevronDown className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin/bookings">
              <LayoutDashboard className="size-4" aria-hidden /> Admin dashboard
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link href="/bookings">
              <Luggage className="size-4" aria-hidden /> My bookings
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={signOut} disabled={isSigningOut}>
          <LogOut className="size-4" aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
