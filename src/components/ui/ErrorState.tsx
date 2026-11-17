"use client";

import { Button } from "./Button";

export function ErrorState({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-20 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted">Please try again. If it keeps happening, refresh the page.</p>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  );
}
