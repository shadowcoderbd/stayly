"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Field, Input, invalidProps } from "@/components/ui/Field";
import { useSignUp } from "../hooks/useAuthMutations";
import { safeRedirect, signUpSchema, type SignUpInput } from "../schemas";
import { AuthCard } from "./AuthCard";
import { GoogleSignInButton } from "./GoogleSignInButton";

export function SignupForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const redirectTo = safeRedirect(useSearchParams().get("redirectTo"));
  const { signUp, isSigningUp, errorMessage, afterAuth } = useSignUp();
  const form = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });
  const { errors } = form.formState;
  const err = (k: keyof SignUpInput) => errors[k]?.message;

  const onSubmit = form.handleSubmit(({ name, email, password }) =>
    signUp({ name, email, password }, { onSuccess: () => afterAuth(redirectTo) }),
  );

  return (
    <AuthCard title="Create your account" subtitle="Request rooms at hand-picked hotels and track every booking.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {errorMessage && (
          <p role="alert" className="rounded-lg bg-red-bg px-3 py-2.5 text-sm text-red-fg">
            {errorMessage}
          </p>
        )}
        <Field label="Name" htmlFor="name" error={err("name")}>
          <Input id="name" autoComplete="name" {...form.register("name")} {...invalidProps("name", err("name"))} />
        </Field>
        <Field label="Email" htmlFor="email" error={err("email")}>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} {...invalidProps("email", err("email"))} />
        </Field>
        <Field label="Password" htmlFor="password" error={err("password")} hint="At least 8 characters.">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
            {...invalidProps("password", err("password"))}
          />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" error={err("confirmPassword")}>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...form.register("confirmPassword")}
            {...invalidProps("confirmPassword", err("confirmPassword"))}
          />
        </Field>
        <Button type="submit" isLoading={isSigningUp} className="mt-1">
          Create account
        </Button>
      </form>
      {googleEnabled && <GoogleSignInButton redirectTo={redirectTo} />}
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="font-medium text-ink underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
