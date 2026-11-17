"use client";

import { NavLinks } from "@/components/layout/NavLinks";
import { useMe } from "../hooks/useMe";

/** "Browse" always; "My bookings" only for signed-in customers (spec F-02). */
export function CustomerNav() {
  const { isSignedIn, isAdmin } = useMe();
  return (
    <NavLinks
      items={[
        { href: "/", label: "Browse", exact: true },
        ...(isSignedIn && !isAdmin ? [{ href: "/bookings", label: "My bookings" }] : []),
        ...(isAdmin ? [{ href: "/admin/bookings", label: "Admin" }] : []),
      ]}
    />
  );
}
