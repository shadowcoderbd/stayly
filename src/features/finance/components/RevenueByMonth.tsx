"use client";

import { useState } from "react";
import { formatCompact, formatMoney, formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FinanceSummary } from "@/server/modules/finance/finance.types";

const PLOT_HEIGHT = 180; // px for the tallest bar

/**
 * One series (net revenue per month): thin dark bars anchored to a shared baseline,
 * a value label on each bar, a hover/focus tooltip, and the same numbers as a text summary.
 */
export function RevenueByMonth({ months }: { months: FinanceSummary["byMonth"] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...months.map((m) => m.netCents));
  const summary = months.map((m) => `${formatMonth(m.month)} ${formatMoney(m.netCents)}`).join("; ");

  return (
    <section className="flex min-w-0 flex-[3_1_480px] flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-semibold">Revenue by month</h2>
      <p className="sr-only">Net confirmed revenue by month: {summary}.</p>
      <div className="overflow-x-auto">
        <div className="flex min-w-[360px] flex-col gap-2" aria-hidden>
          <div className="flex items-end gap-4 border-b border-line pt-2" style={{ height: PLOT_HEIGHT + 32 }}>
            {months.map((m, i) => {
              const h = m.netCents > 0 ? Math.max(4, Math.round((m.netCents / max) * PLOT_HEIGHT)) : 0;
              return (
                <div
                  key={m.month}
                  className="relative flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                >
                  {active === i && (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md">
                      <div className="text-muted">{formatMonth(m.month)} {m.month.slice(0, 4)}</div>
                      <div className="font-semibold">{formatMoney(m.netCents)}</div>
                    </div>
                  )}
                  <span className="text-xs text-muted">{formatCompact(m.netCents)}</span>
                  <div
                    className={cn("w-full max-w-14 rounded-t-[4px] bg-primary transition-opacity", active !== null && active !== i && "opacity-60")}
                    style={{ height: h }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 text-xs text-muted">
            {months.map((m) => (
              <span key={m.month} className="flex-1 text-center">
                {formatMonth(m.month)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
