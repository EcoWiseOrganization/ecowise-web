"use client";

import { AuthLayout } from "@/app/(auth)/_components/AuthLayout";
import { OtpInput } from "@/app/(auth)/_components/OtpInput";
import { useForgotPasswordVerify } from "@/hooks/useForgotPasswordVerify";

export default function ForgotPasswordVerifyPage() {
  const { otp, setOtp, error, loading, email, handleConfirm } = useForgotPasswordVerify();

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
