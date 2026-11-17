import { queryOptions } from "@tanstack/react-query";
import { authApi } from "./api/auth.api";

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

export const authQueries = {
  me: () =>
    queryOptions({
      queryKey: authKeys.me(),
      queryFn: authApi.getSession,
      staleTime: 5 * 60_000,
      meta: { silent: true },
    }),
};
