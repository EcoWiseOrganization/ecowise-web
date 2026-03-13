"use client";

import Link from "next/link";
import { signInWithGoogle } from "@/services/auth.actions";
import { AuthLayout } from "@/app/(auth)/_components/AuthLayout";
import { EyeIcon } from "@/app/(auth)/_components/EyeIcon";
import { EyeSlashIcon } from "@/app/(auth)/_components/EyeSlashIcon";
import { useRegisterForm } from "@/hooks/useRegisterForm";
import { useTranslation } from "react-i18next";

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 32,
  paddingTop: 10,
  paddingBottom: 10,
  paddingLeft: 10,
  paddingRight: 36,
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

const inputStyleNoIcon: React.CSSProperties = {
  ...inputStyle,
  paddingRight: 10,
};

const labelStyle: React.CSSProperties = {
  color: "#141514",
  fontSize: 14,
  fontFamily: "Inter",
  fontWeight: 500,
};

const errorTextStyle: React.CSSProperties = {
  color: "#DC2626",
  fontSize: 12,
  fontFamily: "Inter",
};

export default function RegisterPage() {
  const { t } = useTranslation();
  const {
    showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword,
    agreed, setAgreed,
    loading, errors, generalError,
    handleSubmit,
  } = useRegisterForm();

  return (
    <AuthLayout imageSrc="/img/register.jpg" imageAlt="EcoWise - Green leaves" logoPosition="bottom-right">
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ color: "#1F8505", fontSize: 36, fontFamily: "Inter", fontWeight: 600, wordWrap: "break-word" }}>
          {t("register.title")}
        </div>
        <div style={{ color: "#3B3D3B", fontSize: 16, fontFamily: "Inter", fontWeight: 400, wordWrap: "break-word" }}>
          {t("register.subtitle")}
        </div>
      </div>

      {/* General Error */}
      {generalError && (
        <div style={{ padding: 10, background: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA", color: "#B91C1C", fontSize: 12, fontFamily: "Inter" }}>
          {generalError}
        </div>
      )}

      {/* Form Fields */}
      <form style={{ display: "flex", flexDirection: "column", gap: 20 }} onSubmit={handleSubmit}>
        {/* Name */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label htmlFor="name" style={labelStyle}>{t("register.nameLabel")}</label>
          <input id="name" name="name" type="text" placeholder={t("register.namePlaceholder")} style={inputStyleNoIcon} />
          {errors.name && <span style={errorTextStyle}>{errors.name}</span>}
        </div>

        {/* Email */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label htmlFor="email" style={labelStyle}>{t("register.emailLabel")}</label>
          <input id="email" name="email" type="email" placeholder={t("register.emailPlaceholder")} style={inputStyleNoIcon} />
          {errors.email && <span style={errorTextStyle}>{errors.email}</span>}
        </div>

        {/* Password */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label htmlFor="password" style={labelStyle}>{t("register.passwordLabel")}</label>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("register.passwordPlaceholder")}
              style={inputStyle}
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
          {errors.password && <span style={errorTextStyle}>{errors.password}</span>}
        </div>

        {/* Confirm Password */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label htmlFor="confirmPassword" style={labelStyle}>{t("register.confirmPasswordLabel")}</label>
          <div style={{ position: "relative" }}>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("register.confirmPasswordPlaceholder")}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center",
              }}
            >
              {showConfirmPassword ? <EyeIcon /> : <EyeSlashIcon />}
            </button>
          </div>
          {errors.confirmPassword && <span style={errorTextStyle}>{errors.confirmPassword}</span>}
        </div>

        {/* Terms Checkbox */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <div
            onClick={() => setAgreed(!agreed)}
            style={{
              width: 10, height: 10, borderRadius: 2, border: "1px #C8C8C8 solid",
              cursor: "pointer", background: agreed ? "#1F8505" : "white",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            {agreed && (
              <svg width="7" height="6" viewBox="0 0 8 6" fill="none">
                <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <input id="terms" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ display: "none" }} />
          <label htmlFor="terms" style={{ cursor: "pointer" }}>
            <span style={{ color: "#141514", fontSize: 10, fontFamily: "Inter", fontWeight: 500 }}>{t("register.agreeTerms")}</span>
            <span style={{ color: "#141514", fontSize: 10, fontFamily: "Inter", fontWeight: 500, textDecoration: "underline" }}>{t("register.termsLink")}</span>
          </label>
        </div>

        {/* Sign Up Button */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 6 }}>
          <button type="submit" disabled={!agreed || loading} className="btn-auth-primary">
            {loading ? t("register.sendingCode") : t("register.signUp")}
          </button>
        </div>
      </form>

      {/* Or Divider + Google + Sign In */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, marginTop: -22 }}>
        <div style={{ width: "100%", position: "relative", display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, height: 0, outline: "1px #CECFCD solid", outlineOffset: -0.5 }} />
          <span style={{ paddingLeft: 6, paddingRight: 6, background: "white", color: "#3B3D3B", fontSize: 14, fontFamily: "Inter", fontWeight: 500 }}>{t("register.or")}</span>
          <div style={{ flex: 1, height: 0, outline: "1px #CECFCD solid", outlineOffset: -0.5 }} />
        </div>

        <form action={signInWithGoogle} style={{ width: "100%" }}>
          <button type="submit" className="btn-auth-secondary">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {t("register.signInWithGoogle")}
          </button>
        </form>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#AAAAAA", fontSize: 16, fontFamily: "Inter", fontWeight: 500 }}>{t("register.hasAccount")}</span>
          <Link href="/login" className="link-auth" style={{ color: "#1F8505", fontSize: 16, fontFamily: "Inter", fontWeight: 500, textDecoration: "none" }}>{t("register.signIn")}</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
