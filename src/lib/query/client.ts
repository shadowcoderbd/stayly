import { isServer, MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/http/errors";
import { toast } from "@/lib/toast";
import { queryDefaults } from "./defaults";

function makeBrowserQueryClient() {
  return new QueryClient({
    defaultOptions: queryDefaults,
    // Errors are handled in one place. Opt out per query with meta: { silent: true }.
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (!query.meta?.silent) toast.error(getErrorMessage(error));
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (!mutation.meta?.silent) toast.error(getErrorMessage(error));
      },
    }),
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  // During SSR of client components, always use a fresh client so users never share a cache.
  if (isServer) return new QueryClient({ defaultOptions: queryDefaults });
  return (browserQueryClient ??= makeBrowserQueryClient());
}
