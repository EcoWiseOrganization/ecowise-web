"use client";

import { useState } from "react";

export interface OcrExtractedData {
  activity_name?: string;
  quantity?: number;
  unit?: string;
}

const MOCK_UNITS = ["kWh", "L", "kg", "tonne", "km", "m³", "MJ", "MWh"];
const MOCK_ACTIVITIES = [
  "Electricity Consumption",
  "Diesel Fuel Usage",
  "Petrol Fuel Usage",
  "Business Travel - Domestic Flight",
  "Freight Transport",
  "Natural Gas Combustion",
  "Refrigerant Leakage",
];

/**
 * useOcrDataExtraction
 *
 * Mock hook that simulates an OCR API call.
 * Replace `extractFromImage` internals with a real Vision/OCR API
 * (e.g. Google Vision, AWS Textract, OpenAI GPT-4V) in production.
 */
export function useOcrDataExtraction() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function extractFromImage(file: File): Promise<OcrExtractedData> {
    setIsExtracting(true);
    setPreviewUrl(URL.createObjectURL(file));

    // Simulate OCR processing delay (1.2 – 1.8 s)
    await new Promise((resolve) =>
      setTimeout(resolve, 1200 + Math.random() * 600)
    );

    const result: OcrExtractedData = {
      activity_name:
        MOCK_ACTIVITIES[Math.floor(Math.random() * MOCK_ACTIVITIES.length)],
      quantity: Math.round((Math.random() * 900 + 10) * 10) / 10,
      unit: MOCK_UNITS[Math.floor(Math.random() * MOCK_UNITS.length)],
    };

    setIsExtracting(false);
    return result;
  }

  return { isExtracting, previewUrl, extractFromImage };
}
