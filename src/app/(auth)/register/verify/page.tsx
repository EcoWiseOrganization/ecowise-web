"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/app/(auth)/_components/AuthLayout";
import { OtpInput } from "@/app/(auth)/_components/OtpInput";

export default function VerifyPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("register_email");
    if (!stored) {
      router.replace("/register");
      return;
    }
    setEmail(stored);
  }, [router]);

  const handleConfirm = async () => {
    const code = otp.join("");
    if (code.length !== 4) {
      setError("Please enter the 4-digit code");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const name = sessionStorage.getItem("register_name") || "";
      const password = sessionStorage.getItem("register_password") || "";

      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code, name, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed");
        setLoading(false);
        return;
      }

      // Clear session storage
      sessionStorage.removeItem("register_name");
      sessionStorage.removeItem("register_email");
      sessionStorage.removeItem("register_password");

      router.push("/register/success");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

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

        <button
          onClick={handleConfirm}
          disabled={loading}
          style={{
            width: "100%",
            paddingTop: 10,
            paddingBottom: 10,
            background: loading ? "#b8d4ad" : "#79B669",
            borderRadius: 10,
            border: "none",
            color: "#FCFBFA",
            fontSize: 16,
            fontFamily: "Inter",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            textAlign: "center",
          }}
        >
          {loading ? "Verifying..." : "Confirm"}
        </button>
      </div>
    </AuthLayout>
  );
}
