import type { DefaultOptions } from "@tanstack/react-query";
import { isClientError } from "@/lib/http/errors";

export const queryDefaults: DefaultOptions = {
  queries: {
    staleTime: 60_000, // > 0 so data prefetched on the server isn't refetched right away on mount
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => !isClientError(error) && failureCount < 1, // never retry 4xx
  },
};
