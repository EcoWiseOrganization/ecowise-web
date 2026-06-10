"use client";

import { useEffect, useRef, useState } from "react";
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

  // Track the most-recently created Object URL so we can revoke it
  // before allocating a new one (or on unmount). The previous version
  // called `URL.createObjectURL(file)` on every extract without ever
  // revoking — every receipt the user uploaded leaked an entry in the
  // browser's URL store for the lifetime of the page.
  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  async function extractFromImage(file: File): Promise<OcrExtractedData> {
    setIsExtracting(true);
    setError(null);
    // Revoke the previous preview URL before allocating a new one so
    // back-to-back uploads don't pile up object URLs in memory.
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const next = URL.createObjectURL(file);
    previewUrlRef.current = next;
    setPreviewUrl(next);

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
