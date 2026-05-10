"use client";

import { useState } from "react";
import type { OcrSuggestion } from "@/lib/ocr/types";

export interface OcrExtractedData {
  activity_name?: string;
  quantity?: number;
  unit?: string;
  reporting_date?: string;
  vendor?: string;
  amount?: number;
  /** Provider that produced this result. "mock" = no real key configured. */
  provider?: string;
}

/**
 * useOcrDataExtraction (Phase 11)
 *
 * Calls the real `/api/ocr/extract` endpoint, which routes to the configured
 * OCR provider (Anthropic Claude vision when `ANTHROPIC_API_KEY` is set,
 * otherwise a deterministic mock response). Server-side enforces auth, MIME,
 * and 5 MB size limit.
 */
export function useOcrDataExtraction() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function extractFromImage(file: File): Promise<OcrExtractedData> {
    setIsExtracting(true);
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));

    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/ocr/extract", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        provider?: string;
        suggestion?: OcrSuggestion;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.suggestion) {
        setError(json.error ?? "OCR_PROVIDER_ERROR");
        return { provider: json.provider };
      }
      return {
        provider: json.provider,
        ...json.suggestion,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "ocr_network_error");
      return {};
    } finally {
      setIsExtracting(false);
    }
  }

  return { isExtracting, previewUrl, error, extractFromImage };
}
