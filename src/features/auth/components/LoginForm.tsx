"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Field, Input, invalidProps } from "@/components/ui/Field";
import { useSignIn } from "../hooks/useAuthMutations";
import { safeRedirect, signInSchema, type SignInInput } from "../schemas";
import { AuthCard } from "./AuthCard";

export function LoginForm() {
  const redirectTo = safeRedirect(useSearchParams().get("redirectTo"), "");
  const { signIn, isSigningIn, errorMessage, afterAuth } = useSignIn();
  const form = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    signIn(values, {
      // Admins land in the admin area unless they were sent here from somewhere specific.
      onSuccess: () => afterAuth((user) => redirectTo || (user?.role === "admin" ? "/admin/bookings" : "/")),
    }),
  );

  return (
    <AuthCard title="Sign in" subtitle="Welcome back. Sign in to request and manage bookings.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {errorMessage && (
          <p role="alert" className="rounded-lg bg-red-bg px-3 py-2.5 text-sm text-red-fg">
            {errorMessage}
          </p>
        )}
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} {...invalidProps("email", errors.email?.message)} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...form.register("password")}
            {...invalidProps("password", errors.password?.message)}
          />
        </Field>
        <Button type="submit" isLoading={isSigningIn} className="mt-1">
          Sign in
        </Button>
      </form>
      <p className="text-sm text-muted">
        New to Stayly?{" "}
        <Link href={redirectTo ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}` : "/signup"} className="font-medium text-ink underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
