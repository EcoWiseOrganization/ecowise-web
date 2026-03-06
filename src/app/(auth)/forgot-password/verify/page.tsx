"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/app/(auth)/_components/AuthLayout";
import { OtpInput } from "@/app/(auth)/_components/OtpInput";

export default function ForgotPasswordVerifyPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("forgot_password_email");
    if (!storedEmail) {
      router.replace("/forgot-password");
      return;
    }
    setEmail(storedEmail);
  }, [router]);

  const handleConfirm = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 4) {
      setError("Please enter the 4-digit verification code");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      sessionStorage.setItem("reset_token", data.resetToken);
      router.push("/forgot-password/reset");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

  return (
    <AuthLayout imageSrc="/img/login.png" imageAlt="EcoWise - Green landscape" logoPosition="top-right">
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ color: "#141514", fontSize: 36, fontFamily: "Inter", fontWeight: 600 }}>
          Enter Verification Code
        </div>
        <div style={{ color: "#3B3D3B", fontSize: 16, fontFamily: "Inter", fontWeight: 400 }}>
          Please enter the verification code sent to your email
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: 10, background: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA", color: "#B91C1C", fontSize: 12, fontFamily: "Inter" }}>
          {error}
        </div>
      )}

      {/* OTP Input */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ color: "#141514", fontSize: 14, fontFamily: "Inter", fontWeight: 500 }}>
            OTP Code
          </label>
          <OtpInput value={otp} onChange={setOtp} />
        </div>
      </div>

      {/* Confirm Button */}
      <button
        onClick={handleConfirm}
        disabled={loading}
        style={{
          width: "100%", paddingTop: 10, paddingBottom: 10, background: "#79B669",
          borderRadius: 10, border: "none", color: "#FCFBFA", fontSize: 16,
          fontFamily: "Inter", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1, textAlign: "center",
        }}
      >
        {loading ? "Verifying..." : "Confirm"}
      </button>
    </AuthLayout>
  );
}
