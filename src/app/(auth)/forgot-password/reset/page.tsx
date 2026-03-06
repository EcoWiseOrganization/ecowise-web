"use client";

import { AuthLayout } from "@/app/(auth)/_components/AuthLayout";
import { EyeIcon } from "@/app/(auth)/_components/EyeIcon";
import { EyeSlashIcon } from "@/app/(auth)/_components/EyeSlashIcon";
import { useResetPassword } from "@/hooks/useResetPassword";

export default function ResetPasswordPage() {
  const {
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, setShowPassword,
    showConfirm, setShowConfirm,
    email, error, loading,
    handleReset,
  } = useResetPassword();

  if (!email) return null;

  return (
    <AuthLayout imageSrc="/img/login.png" imageAlt="EcoWise - Green landscape" logoPosition="top-right">
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ color: "#141514", fontSize: 36, fontFamily: "Inter", fontWeight: 600 }}>
          Reset Password
        </div>
        <div style={{ color: "#3B3D3B", fontSize: 16, fontFamily: "Inter", fontWeight: 400 }}>
          Choose a new password for your account
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: 10, background: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA", color: "#B91C1C", fontSize: 12, fontFamily: "Inter" }}>
          {error}
        </div>
      )}

      {/* Password Fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* New Password */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label htmlFor="password" style={{ color: "#141514", fontSize: 14, fontFamily: "Inter", fontWeight: 500 }}>
            New Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your new password"
              style={{
                width: "100%", height: 32, paddingTop: 10, paddingBottom: 10,
                paddingLeft: 10, paddingRight: 36, borderRadius: 8,
                outline: "1px #C8C8C8 solid", outlineOffset: -1, border: "none",
                fontSize: 10, fontFamily: "Inter", fontWeight: 500, color: "#141514",
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center",
              }}
            >
              {showPassword ? <EyeIcon /> : <EyeSlashIcon />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label htmlFor="confirmPassword" style={{ color: "#141514", fontSize: 14, fontFamily: "Inter", fontWeight: 500 }}>
            Confirm Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              style={{
                width: "100%", height: 32, paddingTop: 10, paddingBottom: 10,
                paddingLeft: 10, paddingRight: 36, borderRadius: 8,
                outline: "1px #C8C8C8 solid", outlineOffset: -1, border: "none",
                fontSize: 10, fontFamily: "Inter", fontWeight: 500, color: "#141514",
                boxSizing: "border-box",
              }}
            >
            </input>
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center",
              }}
            >
              {showConfirm ? <EyeIcon /> : <EyeSlashIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <button onClick={handleReset} disabled={loading} className="btn-auth-primary">
        {loading ? "Resetting..." : "Reset Password"}
      </button>
    </AuthLayout>
  );
}
