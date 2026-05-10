/**
 * Shared OCR types used by client + server.
 */

export interface OcrField {
  /** Canonical field name (e.g. "quantity", "date", "vendor"). */
  key: string;
  /** Extracted value as a string — caller coerces. */
  value: string;
  /** 0-1 confidence score from the provider, when available. */
  confidence?: number;
}

export interface OcrResult {
  provider: "anthropic" | "mock";
  /** Raw model response (for debugging). May be omitted in production. */
  raw?: string;
  fields: OcrField[];
}

export interface OcrSuggestion {
  activity_name?: string;
  vendor?: string;
  /** ISO date YYYY-MM-DD. */
  reporting_date?: string;
  quantity?: number;
  unit?: string;
  /** Total monetary amount (currency-agnostic). */
  amount?: number;
}
