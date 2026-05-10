/**
 * Pure parser — extracts canonical fields from a free-form OCR response.
 * Designed to handle both Anthropic JSON output and the mock provider.
 *
 * Looks for a fenced JSON block first; if not present, falls back to
 * line-by-line "key: value" extraction.
 */

import type { OcrField, OcrSuggestion } from "./types";

/** Try to parse a JSON block fenced with ```json. */
export function parseJsonBlock(text: string): unknown {
  const fence = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(text);
  const candidate = fence?.[1] ?? text;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

/** Extract canonical OCR fields from the model's text response. */
export function extractFields(text: string): OcrField[] {
  const json = parseJsonBlock(text);
  if (json && typeof json === "object" && !Array.isArray(json)) {
    return Object.entries(json as Record<string, unknown>).map(([k, v]) => ({
      key: k,
      value: v == null ? "" : String(v),
    }));
  }

  // Fallback: each non-empty line "key: value"
  const out: OcrField[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][\w\s-]*)\s*[:=]\s*(.+?)\s*$/.exec(line);
    if (!m) continue;
    out.push({
      key: m[1].trim().toLowerCase().replace(/\s+/g, "_"),
      value: m[2].trim(),
    });
  }
  return out;
}

/** Coerce `OcrField[]` into a typed suggestion object for the Activity Logger. */
export function fieldsToSuggestion(fields: OcrField[]): OcrSuggestion {
  const out: OcrSuggestion = {};
  for (const f of fields) {
    const k = f.key.toLowerCase();
    const v = f.value.trim();
    if (!v) continue;

    if (
      k === "activity" ||
      k === "activity_name" ||
      k === "name" ||
      k === "description"
    ) {
      out.activity_name = v;
    } else if (k === "vendor" || k === "merchant" || k === "supplier") {
      out.vendor = v;
    } else if (k === "date" || k === "reporting_date" || k === "issued_at") {
      const iso = parseDate(v);
      if (iso) out.reporting_date = iso;
    } else if (
      k === "quantity" ||
      k === "qty" ||
      k === "kwh" ||
      k === "liters" ||
      k === "km"
    ) {
      const n = parseNumber(v);
      if (n !== null) {
        out.quantity = n;
        if (k === "kwh") out.unit = "kWh";
        else if (k === "liters") out.unit = "L";
        else if (k === "km") out.unit = "km";
      }
    } else if (k === "unit") {
      out.unit = v;
    } else if (k === "total" || k === "amount" || k === "grand_total") {
      const n = parseNumber(v);
      if (n !== null) out.amount = n;
    }
  }
  return out;
}

function parseNumber(raw: string): number | null {
  // Strip currency symbols + thousands separators.
  const cleaned = raw.replace(/[^\d.,-]/g, "");
  // Detect dot-vs-comma decimal separator heuristically.
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // Whichever appears last is the decimal separator.
    normalized =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",") && !cleaned.includes(".")) {
    // Treat comma as decimal if exactly one and 1-2 digits trail.
    if (/^\d+,\d{1,2}$/.test(cleaned)) normalized = cleaned.replace(",", ".");
    else normalized = cleaned.replace(/,/g, "");
  }
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseDate(raw: string): string | null {
  // Accept YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, YYYY/MM/DD.
  const iso = /^\d{4}-\d{2}-\d{2}$/.exec(raw);
  if (iso) return raw;

  const m1 = /^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/.exec(raw);
  if (m1) {
    const [, a, b, y] = m1;
    // If a > 12, assume DD/MM
    const dd = Number(a) > 12 ? a : a;
    const mm = Number(a) > 12 ? b : b;
    const day = Number(a) > 12 ? a : a;
    void [dd, mm, day];
    // Heuristic: prefer DD/MM/YYYY for VN locale; mm = b, dd = a
    return `${y}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  }
  const m2 = /^(\d{4})[\/.-](\d{2})[\/.-](\d{2})$/.exec(raw);
  if (m2) {
    const [, y, mm, dd] = m2;
    return `${y}-${mm}-${dd}`;
  }
  // Last resort: Date.parse
  const t = Date.parse(raw);
  if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}
