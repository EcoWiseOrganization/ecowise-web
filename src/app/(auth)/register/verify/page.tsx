"use client";

import { AuthLayout } from "@/app/(auth)/_components/AuthLayout";
import { OtpInput } from "@/app/(auth)/_components/OtpInput";
import { useVerifyOtp } from "@/hooks/useVerifyOtp";

export default function VerifyPage() {
  const { otp, setOtp, error, loading, email, handleConfirm } = useVerifyOtp();

  if (!email) return null;

  return (
    <AuthLayout imageSrc="/img/register.jpg" imageAlt="EcoWise - Green leaves" logoPosition="bottom-right">
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ color: "#1F8505", fontSize: 36, fontFamily: "Inter", fontWeight: 600 }}>
          Verify Your Email
        </div>
        <div style={{ color: "#3B3D3B", fontSize: 16, fontFamily: "Inter", fontWeight: 400 }}>
          We sent a verification code to <strong>{email}</strong>
        </div>
      </div>

      {/* OTP Input */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <OtpInput value={otp} onChange={setOtp} />

        {error && (
          <div style={{ color: "#DC2626", fontSize: 12, fontFamily: "Inter", textAlign: "center" }}>
            {error}
          </div>
        )}

        <button onClick={handleConfirm} disabled={loading} className="btn-auth-primary">
          {loading ? "Verifying..." : "Confirm"}
        </button>
      </div>
    </AuthLayout>
  );
}
