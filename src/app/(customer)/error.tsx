"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function CustomerError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="We couldn't load your bookings" onRetry={reset} />;
}
