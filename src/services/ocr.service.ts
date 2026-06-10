/**
 * Server-only OCR service (Phase 11).
 *
 * Picks an OCR provider based on env:
 *   • ANTHROPIC_API_KEY → Claude Sonnet 4.6 vision (primary)
 *   • else              → mock provider (deterministic placeholder data)
 *
 * Add additional providers (Google Vision, Textract, etc.) by extending the
 * switch in `runOcr`. The route handler `/api/ocr/extract` is the only call
 * site so callers don't need to change.
 */

import "server-only";
import { extractFields, fieldsToSuggestion } from "@/lib/ocr/parser";
import type { OcrResult, OcrSuggestion } from "@/lib/ocr/types";

const PROMPT = `You are an OCR assistant for an environmental sustainability platform.
Read the receipt or utility bill image and reply with a JSON object containing:
- activity_name (string, e.g. "Office electricity bill")
- vendor (string, supplier name if visible)
- reporting_date (string, ISO YYYY-MM-DD if a date is visible)
- quantity (number — energy/distance/fuel quantity if visible)
- unit (string — "kWh", "L", "km", "kg", etc.)
- amount (number — monetary total if visible)

Respond with ONLY the JSON object, no commentary.`;

interface RunInput {
  /** Base64 (no prefix) image bytes. */
  imageBase64: string;
  /** MIME type of the image — image/jpeg, image/png, image/webp. */
  mimeType: string;
}

export async function runOcr(input: RunInput): Promise<OcrResult> {
  if (process.env.ANTHROPIC_API_KEY) {
    return runAnthropic(input);
  }
  return runMock();
}

export function ocrToSuggestion(result: OcrResult): OcrSuggestion {
  return fieldsToSuggestion(result.fields);
}

// ── Anthropic Claude vision ───────────────────────────────────────────────

async function runAnthropic(input: RunInput): Promise<OcrResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      // Default to the latest released Sonnet id. The previous default
      // `claude-sonnet-4-6` does not exist in the Anthropic catalog, so
      // any deploy without `ANTHROPIC_OCR_MODEL` set 404'd on the very
      // first OCR call and surfaced as OCR_PROVIDER_ERROR to the user.
      model: process.env.ANTHROPIC_OCR_MODEL ?? "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: input.mimeType,
                data: input.imageBase64,
              },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    // Don't surface the upstream body — Anthropic error responses can
    // echo back fragments of the prompt or the request body, which
    // then land verbatim in /admin/audit-logs.newValue when the route
    // wraps this throw. Just preserve the status code; the server log
    // (not the audit trail) is the right place for raw debug text.
    console.error(
      `[ocr] anthropic returned ${res.status}`,
      (await res.text()).slice(0, 500),
    );
    throw new Error(`anthropic_error_${res.status}`);
  }
  const json = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text =
    (json.content ?? []).find((c) => c.type === "text")?.text ?? "";
  // Clamp the raw provider response so an unbounded reply (model
  // misbehaving, prompt-injection echo) can't ride through into the
  // form fields. 8 KB is generous for our schema (six short fields).
  const safeText = text.length > 8192 ? text.slice(0, 8192) : text;
  return {
    provider: "anthropic",
    raw: safeText,
    fields: extractFields(safeText),
  };
}

// ── Mock provider ─────────────────────────────────────────────────────────

function runMock(): OcrResult {
  const today = new Date().toISOString().slice(0, 10);
  return {
    provider: "mock",
    raw: "MOCK_OCR",
    fields: [
      { key: "activity_name", value: "Office electricity (sample)" },
      { key: "vendor", value: "EVN Hanoi" },
      { key: "reporting_date", value: today },
      { key: "quantity", value: "182" },
      { key: "unit", value: "kWh" },
      { key: "amount", value: "527000" },
    ],
  };
}
