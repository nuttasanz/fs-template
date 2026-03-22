/**
 * The name of the HttpOnly session cookie sent to and read from the browser.
 * Kept as a compile-time constant (not an env var) because it is an internal
 * implementation detail, not an operator-controlled setting.
 */
export const COOKIE_NAME = 'sid' as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Convert a whole number of days to milliseconds. */
export function daysToMs(days: number): number {
  return days * MS_PER_DAY;
}
