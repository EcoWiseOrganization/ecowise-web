import { describe, it, expect } from "vitest";
import {
  extractFields,
  fieldsToSuggestion,
  parseJsonBlock,
} from "@/lib/ocr/parser";

describe("parseJsonBlock", () => {
  it("parses fenced ```json block", () => {
    const text =
      'Here is the data:\n```json\n{ "quantity": 12.5, "unit": "kWh" }\n```';
    expect(parseJsonBlock(text)).toEqual({ quantity: 12.5, unit: "kWh" });
  });

  it("parses raw JSON without fence", () => {
    expect(parseJsonBlock('{"a":1}')).toEqual({ a: 1 });
  });

  it("returns null on malformed", () => {
    expect(parseJsonBlock("not json")).toBeNull();
  });
});

describe("extractFields (JSON path)", () => {
  it("flattens object", () => {
    const fields = extractFields(
      '{ "activity_name": "Office electricity", "quantity": 182, "unit": "kWh" }'
    );
    expect(fields).toEqual([
      { key: "activity_name", value: "Office electricity" },
      { key: "quantity", value: "182" },
      { key: "unit", value: "kWh" },
    ]);
  });
});

describe("extractFields (key:value fallback)", () => {
  it("normalizes keys + trims values", () => {
    const fields = extractFields(`Vendor: EVN
      Reporting Date : 2026-04-12
      Quantity = 182.4
      Unit: kWh`);
    expect(fields.find((f) => f.key === "vendor")?.value).toBe("EVN");
    expect(fields.find((f) => f.key === "reporting_date")?.value).toBe(
      "2026-04-12"
    );
    expect(fields.find((f) => f.key === "quantity")?.value).toBe("182.4");
  });
});

describe("fieldsToSuggestion", () => {
  it("coerces typed suggestion", () => {
    const s = fieldsToSuggestion([
      { key: "activity_name", value: "Office electricity" },
      { key: "vendor", value: "EVN" },
      { key: "reporting_date", value: "2026-04-12" },
      { key: "quantity", value: "182.4" },
      { key: "unit", value: "kWh" },
      { key: "amount", value: "527000" },
    ]);
    expect(s).toEqual({
      activity_name: "Office electricity",
      vendor: "EVN",
      reporting_date: "2026-04-12",
      quantity: 182.4,
      unit: "kWh",
      amount: 527000,
    });
  });

  it("handles VN-formatted decimals (comma)", () => {
    const s = fieldsToSuggestion([{ key: "quantity", value: "1.234,56" }]);
    expect(s.quantity).toBeCloseTo(1234.56, 2);
  });

  it("infers unit from kwh key", () => {
    const s = fieldsToSuggestion([{ key: "kwh", value: "100" }]);
    expect(s.quantity).toBe(100);
    expect(s.unit).toBe("kWh");
  });

  it("parses DD/MM/YYYY date heuristically", () => {
    const s = fieldsToSuggestion([{ key: "date", value: "12/04/2026" }]);
    expect(s.reporting_date).toBe("2026-04-12");
  });

  it("returns empty when no matching keys", () => {
    expect(fieldsToSuggestion([])).toEqual({});
  });
});
