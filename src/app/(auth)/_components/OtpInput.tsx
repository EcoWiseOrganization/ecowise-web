"use client";

import { useRef } from "react";

interface OtpInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  /** Number of digits to render (default 6 — matches our 6-digit OTPs). */
  length?: number;
}

export function OtpInput({ value, onChange, length = 6 }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, digit: string) => {
    if (!/^\d?$/.test(digit)) return;
    const newValue = [...value];
    newValue[index] = digit;
    onChange(newValue);
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!pasted) return;
    const newValue = [...value];
    for (let i = 0; i < length; i++) {
      newValue[i] = pasted[i] || "";
    }
    onChange(newValue);
    const focusIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] ?? ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          style={{
            width: 44,
            height: 50,
            textAlign: "center",
            fontSize: 24,
            fontFamily: "Inter",
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            outline: "2px #C8C8C8 solid",
            outlineOffset: -2,
            color: "#141514",
          }}
          onFocus={(e) => { e.target.style.outlineColor = "#1F8505"; }}
          onBlur={(e) => { e.target.style.outlineColor = "#C8C8C8"; }}
        />
      ))}
    </div>
  );
}
