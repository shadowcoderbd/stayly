import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth";
import { googleAuthEnabled } from "@/server/config/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  // Google sign-in is runtime config: never prerender this page with build-time env.
  await connection();
  return (
    <Suspense>
      <LoginForm googleEnabled={googleAuthEnabled} />
    </Suspense>
  );
}
