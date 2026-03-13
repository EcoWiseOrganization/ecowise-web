"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "@/services/auth.actions";
import { AuthLayout } from "@/app/(auth)/_components/AuthLayout";
import { EyeIcon } from "@/app/(auth)/_components/EyeIcon";
import { EyeSlashIcon } from "@/app/(auth)/_components/EyeSlashIcon";
import { useTranslation } from "react-i18next";

function LoginForm() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);

  const error = searchParams.get("error");
  const message = searchParams.get("message");

  return (
    <AuthLayout imageSrc="/img/login.png" imageAlt="EcoWise - Green landscape" logoPosition="top-right">
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ color: "#1F8505", fontSize: 36, fontFamily: "Inter", fontWeight: 600, wordWrap: "break-word" }}>
          {t("login.welcome")}
        </div>
        <div style={{ color: "#3B3D3B", fontSize: 16, fontFamily: "Inter", fontWeight: 400, wordWrap: "break-word" }}>
          {t("login.subtitle")}
        </div>
      </div>

      {/* Error / Success Messages */}
      {error && (
        <div style={{ padding: "10px", background: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA", color: "#B91C1C", fontSize: 12, fontFamily: "Inter" }}>
          {error}
        </div>
      )}
      {message && (
        <div style={{ padding: "10px", background: "#F0FDF4", borderRadius: 8, border: "1px solid #BBF7D0", color: "#15803D", fontSize: 12, fontFamily: "Inter" }}>
          {message}
        </div>
      )}

      {/* Form Fields */}
      <form action={login} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Email */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label htmlFor="email" style={{ color: "#141514", fontSize: 14, fontFamily: "Inter", fontWeight: 500 }}>
            {t("login.emailLabel")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder={t("login.emailPlaceholder")}
            style={{
              height: 32, paddingTop: 10, paddingBottom: 10, paddingLeft: 10,
              borderRadius: 8, outline: "1px #C8C8C8 solid", outlineOffset: -1,
              border: "none", fontSize: 10, fontFamily: "Inter", fontWeight: 500, color: "#141514",
            }}
          />
        </div>

        {/* Password */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="password" style={{ color: "#141514", fontSize: 14, fontFamily: "Inter", fontWeight: 500 }}>
              {t("login.passwordLabel")}
            </label>
            <Link href="/forgot-password" style={{ color: "#6E726E", fontSize: 10, fontFamily: "Inter", fontWeight: 500, textDecoration: "none" }}>
              {t("login.forgotPassword")}
            </Link>
          </div>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder={t("login.passwordPlaceholder")}
              style={{
                width: "100%", height: 32, paddingTop: 10, paddingBottom: 10,
                paddingLeft: 10, paddingRight: 36, borderRadius: 8,
                outline: "1px #C8C8C8 solid", outlineOffset: -1, border: "none",
                fontSize: 10, fontFamily: "Inter", fontWeight: 500, color: "#141514", boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center",
              }}
            >
              {showPassword ? <EyeIcon /> : <EyeSlashIcon />}
            </button>
          </div>
        </div>

        {/* Sign In Button */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 26 }}>
          <button type="submit" className="btn-auth-primary">
            {t("login.signIn")}
          </button>
        </div>
      </form>

      {/* Or Divider + Google + Sign Up */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, marginTop: -22 }}>
        <div style={{ width: "100%", position: "relative", display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, height: 0, outline: "1px #CECFCD solid", outlineOffset: -0.5 }} />
          <span style={{ paddingLeft: 6, paddingRight: 6, background: "white", color: "#3B3D3B", fontSize: 14, fontFamily: "Inter", fontWeight: 500 }}>{t("login.or")}</span>
          <div style={{ flex: 1, height: 0, outline: "1px #CECFCD solid", outlineOffset: -0.5 }} />
        </div>

        <a href="/api/auth/google" className="btn-auth-secondary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none" }}>
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {t("login.signInWithGoogle")}
        </a>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#AAAAAA", fontSize: 16, fontFamily: "Inter", fontWeight: 500 }}>{t("login.noAccount")}</span>
          <Link href="/register" className="link-auth" style={{ color: "#1F8505", fontSize: 16, fontFamily: "Inter", fontWeight: 500, textDecoration: "none" }}>{t("login.signUp")}</Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
