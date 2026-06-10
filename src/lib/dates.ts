/**
 * Timezone-aware date helpers.
 *
 * `new Date().toISOString().slice(0, 10)` returns the UTC calendar
 * date. For an EcoWise user in Vietnam (UTC+07:00) logging activity
 * just before midnight, the UTC date is still "yesterday" — the
 * activity logger then writes the wrong `reporting_date` and the
 * BR-09 once-per-day counter (migration 026) double-charges them
 * because the daily key is also UTC.
 *
 * `LOCAL_TZ` is the project's reporting timezone — VN-first, but
 * surfaced as a constant so a future ENV override (or i18n-driven
 * runtime tz) plugs in cleanly. All date-only fields the user
 * "sees" (reporting_date, target end_date, activity log default,
 * compare period defaults) should derive from this helper.
 *
 * Wall-clock-only — never call this for timestamps that span the
 * server / client boundary as UTC. ISO datetimes (`toISOString()`,
 * `created_at`) stay UTC; only date-only columns shift.
 */

export const LOCAL_TZ = "Asia/Ho_Chi_Minh";

/**
 * Returns the YYYY-MM-DD calendar date for `at` (default now) in the
 * configured local timezone. Uses `Intl.DateTimeFormat` so we don't
 * have to hand-roll DST math — VN doesn't observe DST today but a
 * future cross-region rollout might.
 */
export function todayLocalISO(at: Date = new Date(), tz: string = LOCAL_TZ): string {
  // en-CA's "YYYY-MM-DD" output is the calendar-friendly default.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Calendar date `n` days before/after `from` in local tz. */
export function shiftLocalDays(
  daysOffset: number,
  from: Date = new Date(),
  tz: string = LOCAL_TZ,
): string {
  const shifted = new Date(from.getTime() + daysOffset * 86_400_000);
  return todayLocalISO(shifted, tz);
}

/** First day of `from`'s local-tz month, as YYYY-MM-DD. */
export function localMonthStartISO(from: Date = new Date(), tz: string = LOCAL_TZ): string {
  const yyyymmdd = todayLocalISO(from, tz);
  return `${yyyymmdd.slice(0, 7)}-01`;
}

/**
 * Last day of `from`'s local-tz month, as YYYY-MM-DD. Computed via
 * `new Date(year, monthIndex+1, 0)` then re-projected to local tz —
 * uses the local-tz year/month numbers so the boundary lines up with
 * the user's perception of "this month".
 */
export function localMonthEndISO(from: Date = new Date(), tz: string = LOCAL_TZ): string {
  const ymd = todayLocalISO(from, tz);
  const [y, m] = ymd.split("-").map((s) => Number(s));
  // `new Date(y, m, 0)` returns day 0 of next month = last day of month m,
  // interpreted in the local Node timezone. We only need the (Y, M, day)
  // tuple so timezone of the constructed Date doesn't matter past the
  // numbers it exposes via getDate().
  const lastDay = new Date(y, m, 0).getDate();
  return `${ymd.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
}
