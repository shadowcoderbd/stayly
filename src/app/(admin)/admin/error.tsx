"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="This admin page couldn't load" onRetry={reset} />;
}
