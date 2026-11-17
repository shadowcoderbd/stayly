"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Something went wrong" onRetry={reset} />;
}
