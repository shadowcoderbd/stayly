import "@tanstack/react-query";

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: { silent?: boolean }; // true = skip the global error toast
    mutationMeta: { silent?: boolean };
  }
}
