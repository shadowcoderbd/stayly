import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/features/auth";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
