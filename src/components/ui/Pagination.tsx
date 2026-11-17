"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export function Pagination({
  page,
  totalPages,
  totalDocs,
  onChange,
  label = "results",
}: {
  page: number;
  totalPages: number;
  totalDocs: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <span>
        Page {page} of {totalPages} · {totalDocs.toLocaleString("en-US")} {label}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="md" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="size-4" aria-hidden /> Previous
        </Button>
        <Button variant="outline" size="md" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
          Next <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
