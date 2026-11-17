"use client";

import { cn } from "@/lib/utils";

export type ChipTab<T extends string> = { value: T; label: string };

/** The filter tabs from the design ("All · 4", "Pending · 1"). Backed by URL state in each feature. */
export function ChipTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: ChipTab<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const isActive = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.value)}
            className={cn(
              "h-9 cursor-pointer rounded-lg border px-3.5 text-sm transition-colors",
              isActive ? "border-primary bg-primary text-white" : "border-line bg-surface text-body hover:bg-hover",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
