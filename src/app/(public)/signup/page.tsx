import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SignupForm } from "@/features/auth";
import { googleAuthEnabled } from "@/server/config/env";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  // Google sign-in is runtime config: never prerender this page with build-time env.
  await connection();
  return (
    <Suspense>
      <SignupForm googleEnabled={googleAuthEnabled} />
    </Suspense>
  );
}
