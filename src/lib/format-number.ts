/**
 * Number formatters pinned to "en-US".
 *
 * Why a fixed locale instead of `toLocaleString(undefined, …)`:
 *   Node (server) and browsers (client) often resolve a different default
 *   locale, so the same number renders "9.3" on one side and "9,3" on the
 *   other. That mismatch trips Next.js's hydration check. Pinning every
 *   number that ends up in HTML to one locale keeps SSR and client output
 *   byte-identical.
 */

const LOCALE = "en-US";

/** Integer with thousands separators (e.g. 12345 → "12,345"). */
export function formatInt(n: number): string {
  return Math.trunc(n).toLocaleString(LOCALE);
}

/** USD amount with 2 decimals (e.g. 1234.5 → "$1,234.50"). */
export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** VND amount, no decimals (e.g. 20000000 → "20,000,000 VND"). */
export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString(LOCALE)} VND`;
}

/**
 * Money formatter that respects the stored currency code. VND renders with
 * no decimals + a "VND" suffix; everything else falls back to USD ($, 2dp).
 * Keeps mixed historical (USD) and new (VND) invoices rendering correctly.
 */
export function formatMoney(amount: number, currency: string): string {
  return currency === "VND" ? formatVnd(amount) : formatUsd(amount);
}

/**
 * CO₂e mass: "kg" under 1 t, "tCO₂e" above. One decimal in both cases.
 * Example: 925.4 → "925.4 kg", 12345 → "12.3 tCO₂e".
 */
export function formatKg(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toLocaleString(LOCALE, {
      maximumFractionDigits: 1,
    })} tCO₂e`;
  }
  return `${kg.toLocaleString(LOCALE, { maximumFractionDigits: 1 })} kg`;
}
