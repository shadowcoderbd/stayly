import "server-only";
import { serverEnv } from "@/server/config/env";

export { addDays, nightsBetween } from "@/lib/dates";

/** Today's date (YYYY-MM-DD) in the app time zone. */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: serverEnv.APP_TIMEZONE }).format(new Date());
}
