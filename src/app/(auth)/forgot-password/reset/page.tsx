"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/app/(auth)/_components/AuthLayout";
import { EyeIcon } from "@/app/(auth)/_components/EyeIcon";
import { EyeSlashIcon } from "@/app/(auth)/_components/EyeSlashIcon";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("forgot_password_email");
    const storedToken = sessionStorage.getItem("reset_token");
    if (!storedEmail || !storedToken) {
      router.replace("/forgot-password");
      return;
    }
    setEmail(storedEmail);
    setResetToken(storedToken);
  }, [router]);

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, resetToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      // Clean up session storage
      sessionStorage.removeItem("forgot_password_email");
      sessionStorage.removeItem("reset_token");
      router.push("/forgot-password/success");
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
            />
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
      <button
        onClick={handleReset}
        disabled={loading}
        style={{
          width: "100%", paddingTop: 10, paddingBottom: 10, background: "#79B669",
          borderRadius: 10, border: "none", color: "#FCFBFA", fontSize: 16,
          fontFamily: "Inter", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1, textAlign: "center",
        }}
      >
        {loading ? "Resetting..." : "Reset Password"}
      </button>
    </AuthLayout>
  );
}
