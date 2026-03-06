"use client";

import { AuthLayout } from "@/app/(auth)/_components/AuthLayout";
import { useForgotPassword } from "@/hooks/useForgotPassword";

export default function ForgotPasswordPage() {
  const { email, setEmail, error, loading, sent, resending, handleSend, handleResend } = useForgotPassword();

  return (
    <AuthLayout imageSrc="/img/login.png" imageAlt="EcoWise - Green landscape" logoPosition="top-right">
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ color: "#141514", fontSize: 36, fontFamily: "Inter", fontWeight: 600 }}>
          Forgot Password
        </div>
        <div style={{ color: "#3B3D3B", fontSize: 16, fontFamily: "Inter", fontWeight: 400 }}>
          Please enter the email address you used to create your account so we can send you a password reset verification code
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: 10, background: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA", color: "#B91C1C", fontSize: 12, fontFamily: "Inter" }}>
          {error}
        </div>
      )}

      {/* Sent confirmation */}
      {sent && !error && (
        <div style={{ padding: 10, background: "#F0FDF4", borderRadius: 8, border: "1px solid #BBF7D0", color: "#15803D", fontSize: 12, fontFamily: "Inter" }}>
          Verification code sent! Check your email.
        </div>
      )}

      {/* Email Field */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label htmlFor="email" style={{ color: "#141514", fontSize: 14, fontFamily: "Inter", fontWeight: 500 }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your registered email"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            style={{
              height: 32, paddingTop: 10, paddingBottom: 10, paddingLeft: 10,
              borderRadius: 8, outline: "1px #C8C8C8 solid", outlineOffset: -1,
              border: "none", fontSize: 10, fontFamily: "Inter", fontWeight: 500, color: "#141514",
            }}
          />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            width: "100%", paddingTop: 10, paddingBottom: 10, background: "#79B669",
            borderRadius: 10, border: "none", color: "#FCFBFA", fontSize: 16,
            fontFamily: "Inter", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1, textAlign: "center",
          }}
        >
          {loading ? "Sending..." : "Send"}
        </button>
        <button
          onClick={handleResend}
          disabled={resending || !sent}
          style={{
            width: "100%", paddingTop: 10, paddingBottom: 10,
            borderRadius: 10, outline: "1px #95C289 solid", outlineOffset: -1,
            border: "none", background: "white", color: "#79B669", fontSize: 16,
            fontFamily: "Inter", fontWeight: 600,
            cursor: resending || !sent ? "not-allowed" : "pointer",
            opacity: resending || !sent ? 0.5 : 1, textAlign: "center",
          }}
        >
          {resending ? "Resending..." : "Resend Email"}
        </button>
      </div>
    </AuthLayout>
  );
}
