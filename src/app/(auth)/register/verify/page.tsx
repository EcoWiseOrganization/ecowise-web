"use client";

import { Suspense } from "react";
import { AuthLayout } from "@/app/(auth)/_components/AuthLayout";
import { OtpInput } from "@/app/(auth)/_components/OtpInput";
import { EyeIcon } from "@/app/(auth)/_components/EyeIcon";
import { EyeSlashIcon } from "@/app/(auth)/_components/EyeSlashIcon";
import { useVerifyOtp } from "@/hooks/useVerifyOtp";

const passwordInputStyle: React.CSSProperties = {
  width: "100%",
  height: 32,
  padding: "10px 36px 10px 10px",
  borderRadius: 8,
  outline: "1px #C8C8C8 solid",
  outlineOffset: -1,
  border: "none",
  fontSize: 10,
  fontFamily: "Inter",
  fontWeight: 500,
  color: "#141514",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  color: "#141514",
  fontSize: 14,
  fontFamily: "Inter",
  fontWeight: 500,
};

function VerifyForm() {
  const {
    otp,
    setOtp,
    error,
    loading,
    email,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    handleConfirm,
  } = useVerifyOtp();

  if (!email) return null;

  return (
    <AuthLayout imageSrc="/img/register.png" imageAlt="EcoWise - Green leaves" logoPosition="bottom-right">
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ color: "#1F8505", fontSize: 36, fontFamily: "Inter", fontWeight: 600 }}>
          Verify Your Email
        </div>
        <div style={{ color: "#3B3D3B", fontSize: 16, fontFamily: "Inter", fontWeight: 400 }}>
          We sent a 6-digit verification code to <strong>{email}</strong>. Enter
          the code and choose a password to finish signing up.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <OtpInput value={otp} onChange={setOtp} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label htmlFor="password" style={labelStyle}>Password</label>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              style={passwordInputStyle}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeIcon /> : <EyeSlashIcon />}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label htmlFor="confirmPassword" style={labelStyle}>Confirm password</label>
          <div style={{ position: "relative" }}>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              style={passwordInputStyle}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
              }}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeIcon /> : <EyeSlashIcon />}
            </button>
          </div>
        </div>

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

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
