"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/http/errors";
import { authApi } from "../api/auth.api";
import { authKeys, authQueries } from "../queries";
import type { SessionUser } from "../schemas";

/** After auth changes: refresh the session, then let Server Components re-render with the new cookie. */
function useAfterAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async (redirectTo: string | ((user: SessionUser | null) => string)) => {
    const session = await queryClient.fetchQuery({ ...authQueries.me(), staleTime: 0 });
    const target = typeof redirectTo === "function" ? redirectTo(session?.user ?? null) : redirectTo;
    router.replace(target);
    router.refresh();
  };
}

export function useSignIn() {
  const afterAuth = useAfterAuth();
  const { mutate: signIn, isPending: isSigningIn, error } = useMutation({
    mutationFn: authApi.signIn,
    meta: { silent: true }, // the form shows the error inline
  });
  // Don't reveal which of email or password was wrong (spec F-01).
  const errorMessage = error
    ? isAxiosError(error) && error.response?.status === 401
      ? "Email or password is incorrect."
      : getErrorMessage(error)
    : null;
  return { signIn, isSigningIn, errorMessage, afterAuth };
}

export function useSignUp() {
  const afterAuth = useAfterAuth();
  const { mutate: signUp, isPending: isSigningUp, error } = useMutation({
    mutationFn: authApi.signUp,
    meta: { silent: true },
  });
  return { signUp, isSigningUp, errorMessage: error ? getErrorMessage(error) : null, afterAuth };
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { mutate, isPending: isSigningOut } = useMutation({
    mutationFn: authApi.signOut,
    meta: { silent: true },
    // Clear the cache even if the call fails (architecture.md §10.2).
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(authKeys.me(), null);
      router.replace("/");
      router.refresh();
    },
  });
  return { signOut: () => mutate(), isSigningOut };
}
