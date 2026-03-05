"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithGoogle } from "@/app/(auth)/login/actions";
import { AuthLayout } from "@/app/(auth)/_components/AuthLayout";
import { EyeIcon } from "@/app/(auth)/_components/EyeIcon";
import { EyeSlashIcon } from "@/app/(auth)/_components/EyeSlashIcon";

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
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const validate = (name: string, email: string, password: string, confirmPassword: string) => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Please enter a valid email";
    if (!password) errs.password = "Password is required";
    else if (password.length < 6) errs.password = "Password must be at least 6 characters";
    if (!confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = (form.get("name") as string) || "";
    const email = (form.get("email") as string) || "";
    const password = (form.get("password") as string) || "";
    const confirmPassword = (form.get("confirmPassword") as string) || "";

    const errs = validate(name, email, password, confirmPassword);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setGeneralError("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGeneralError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      // Store in sessionStorage for the verify page
      sessionStorage.setItem("register_name", name);
      sessionStorage.setItem("register_email", email);
      sessionStorage.setItem("register_password", password);

      router.push("/register/verify");
    } catch {
      setGeneralError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout imageSrc="/img/register.jpg" imageAlt="EcoWise - Green leaves" logoPosition="bottom-right">
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ color: "#1F8505", fontSize: 36, fontFamily: "Inter", fontWeight: 600, wordWrap: "break-word" }}>
          Get Started Now
        </div>
        <div style={{ color: "#3B3D3B", fontSize: 16, fontFamily: "Inter", fontWeight: 400, wordWrap: "break-word" }}>
          Quickly sign up to use our services
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
          <label htmlFor="name" style={labelStyle}>Name</label>
          <input id="name" name="name" type="text" placeholder="Enter your name" style={inputStyleNoIcon} />
          {errors.name && <span style={errorTextStyle}>{errors.name}</span>}
        </div>

        {/* Email */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label htmlFor="email" style={labelStyle}>Email</label>
          <input id="email" name="email" type="email" placeholder="Enter your email" style={inputStyleNoIcon} />
          {errors.email && <span style={errorTextStyle}>{errors.email}</span>}
        </div>

        {/* Password */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label htmlFor="password" style={labelStyle}>Password</label>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
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
          <label htmlFor="confirmPassword" style={labelStyle}>Confirm Password</label>
          <div style={{ position: "relative" }}>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter your password"
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
            <span style={{ color: "#141514", fontSize: 10, fontFamily: "Inter", fontWeight: 500 }}>I agree to the </span>
            <span style={{ color: "#141514", fontSize: 10, fontFamily: "Inter", fontWeight: 500, textDecoration: "underline" }}>terms & policy</span>
          </label>
        </div>

        {/* Sign Up Button */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 6 }}>
          <button
            type="submit"
            disabled={!agreed || loading}
            style={{
              width: "100%", paddingTop: 10, paddingBottom: 10,
              background: agreed && !loading ? "#79B669" : "#b8d4ad",
              borderRadius: 10, border: "none", color: "#FCFBFA",
              fontSize: 16, fontFamily: "Inter", fontWeight: 600,
              cursor: agreed && !loading ? "pointer" : "not-allowed", textAlign: "center",
            }}
          >
            {loading ? "Sending code..." : "Sign up"}
          </button>
        </div>
      </form>

      {/* Or Divider + Google + Sign In */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, marginTop: -22 }}>
        <div style={{ width: "100%", position: "relative", display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, height: 0, outline: "1px #CECFCD solid", outlineOffset: -0.5 }} />
          <span style={{ paddingLeft: 6, paddingRight: 6, background: "white", color: "#3B3D3B", fontSize: 14, fontFamily: "Inter", fontWeight: 500 }}>Or</span>
          <div style={{ flex: 1, height: 0, outline: "1px #CECFCD solid", outlineOffset: -0.5 }} />
        </div>

        <form action={signInWithGoogle} style={{ width: "100%" }}>
          <button
            type="submit"
            style={{
              width: "100%", paddingTop: 10, paddingBottom: 10, borderRadius: 10,
              outline: "1px #95C289 solid", outlineOffset: -1, border: "none",
              background: "white", cursor: "pointer", display: "flex",
              justifyContent: "center", alignItems: "center", gap: 10,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span style={{ color: "#79B669", fontSize: 16, fontFamily: "Inter", fontWeight: 500 }}>Sign in with Google</span>
          </button>
        </form>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#AAAAAA", fontSize: 16, fontFamily: "Inter", fontWeight: 500 }}>Have an account?</span>
          <Link href="/login" style={{ color: "#1F8505", fontSize: 16, fontFamily: "Inter", fontWeight: 500, textDecoration: "none" }}>Sign in</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
