// Month helpers for "YYYY-MM" strings. Pure and isomorphic.

export type Period = { from: string; to: string }; // inclusive months

export const MAX_PERIOD_MONTHS = 24;

export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

export function monthsIn({ from, to }: Period) {
  const out: string[] = [];
  for (let m = from; m <= to && out.length < 36; m = addMonths(m, 1)) out.push(m);
  return out;
}

/** The last 6 calendar months including the one `today` falls in (spec F-13). */
export function defaultPeriod(today: string): Period {
  const to = today.slice(0, 7);
  return { from: addMonths(to, -5), to };
}
