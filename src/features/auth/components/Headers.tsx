"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { NavLinks } from "@/components/layout/NavLinks";
import { CustomerNav } from "./CustomerNav";
import { UserMenu } from "./UserMenu";

export function CustomerHeader() {
  return <AppHeader homeHref="/" nav={<CustomerNav />} account={<UserMenu />} />;
}

export function AdminHeader() {
  return (
    <AppHeader
      homeHref="/admin/bookings"
      isAdmin
      nav={
        <NavLinks
          items={[
            { href: "/admin/hotels", label: "Hotels" },
            { href: "/admin/bookings", label: "Bookings" },
            { href: "/admin/finance", label: "Finance" },
          ]}
        />
      }
      account={<UserMenu />}
    />
  );
}
