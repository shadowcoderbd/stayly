const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** $477.00 */
export const formatMoney = (cents: number) => usd.format(cents / 100);

/** $142 (nightly rates and KPIs; keeps cents only when there are some) */
export const formatPrice = (cents: number) => (cents % 100 === 0 ? usdWhole : usd).format(cents / 100);

/** $2.1k */
export function formatCompact(cents: number) {
  const dollars = cents / 100;
  return Math.abs(dollars) >= 1000 ? `$${(dollars / 1000).toFixed(1)}k` : usdWhole.format(dollars);
}

const parseDay = (day: string) => new Date(`${day}T00:00:00Z`);
const md = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const mdy = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** "Nov 15" for a YYYY-MM-DD or ISO timestamp */
export const formatDay = (value: string) => md.format(value.length === 10 ? parseDay(value) : new Date(value));
export const formatDate = (value: string) => mdy.format(value.length === 10 ? parseDay(value) : new Date(value));

/**
 * "Dec 12 – Dec 15, 2026". With `omitCurrentYear`, "Dec 12 – Dec 15" when both are this year (admin tables).
 */
export function formatStay(checkIn: string, checkOut: string, { omitCurrentYear = false } = {}) {
  const a = parseDay(checkIn);
  const b = parseDay(checkOut);
  const year = new Date().getUTCFullYear();
  if (omitCurrentYear && a.getUTCFullYear() === year && b.getUTCFullYear() === year) return `${md.format(a)} – ${md.format(b)}`;
  if (a.getUTCFullYear() === b.getUTCFullYear()) return `${md.format(a)} – ${mdy.format(b)}`;
  return `${mdy.format(a)} – ${mdy.format(b)}`;
}

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const monthYearFmt = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
/** "2026-06" → "Jun" */
export const formatMonth = (month: string) => monthFmt.format(parseDay(`${month}-01`));
/** "2026-06".."2026-11" → "Jun – Nov 2026" */
export function formatMonthRange(from: string, to: string) {
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${sameYear ? formatMonth(from) : monthYearFmt.format(parseDay(`${from}-01`))} – ${monthYearFmt.format(parseDay(`${to}-01`))}`;
}

/** Today as YYYY-MM-DD in the viewer's time zone (for date input minimums). */
export function todayLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export { addDays, nightsBetween } from "./dates";
