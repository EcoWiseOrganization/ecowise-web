import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkIsGoogleOnlyAccount } from "@/services/user.service";
import { wrapBrand } from "@/lib/emails";
import { generateOtp, normaliseEmail, otpExpiry } from "@/lib/otp";
import { clientIp, consumeAuthRateLimit } from "@/lib/rate-limit";
import nodemailer from "nodemailer";

/** Minimal HTML escape so a user-controlled `name` can't smuggle markup
 * into the OTP email body. We don't try to allow any formatting here. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Register step 1 — email + display name only.
 *
 * Password is NOT collected here anymore. The previous flow accepted it,
 * sat on it in sessionStorage, then re-sent it to /verify-otp — meaning
 * a user's plaintext password was both XSS-readable and shipped to two
 * separate endpoints. Now the password is captured only on the verify
 * page right before account creation; nothing crosses the wire twice.
 *
 * The `name` is persisted on the OTP row so the verify step can use it
 * for `auth.signUp(...).options.data.full_name` without trusting the
 * client to round-trip it back.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = normaliseEmail(body?.email);

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 },
    );
  }

  // Rate limit BEFORE the Google-only / mail-send work so a flood can't
  // burn the Gmail quota or the listUsers admin call. Per-email and
  // per-IP buckets are checked independently so a single bad actor can
  // hammer different emails but not the same email forever, and one
  // email can be probed from different IPs without one IP locking
  // everyone out via NAT.
  const ip = clientIp(request);
  const perEmail = await consumeAuthRateLimit(`send-otp:email:${email}`, {
    windowSec: 60 * 60,
    max: 3,
  });
  if (!perEmail.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(perEmail.retryAfterSec ?? 60) } },
    );
  }
  const perIp = await consumeAuthRateLimit(`send-otp:ip:${ip}`, {
    windowSec: 60 * 60,
    max: 10,
  });
  if (!perIp.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(perIp.retryAfterSec ?? 60) } },
    );
  }

  const isGoogleOnly = await checkIsGoogleOnlyAccount(email);
  if (isGoogleOnly) {
    return NextResponse.json({ error: "GOOGLE_ACCOUNT_ONLY" }, { status: 400 });
  }

  const supabase = await createClient();
  const otp = generateOtp();
  const expiresAt = otpExpiry();

  // Replace any in-flight OTP for this email; failed_attempts resets to 0
  // via the column default on insert.
  await supabase.from("otp_verifications").delete().eq("email", email);

  const { error: insertError } = await supabase.from("otp_verifications").insert({
    email,
    otp,
    name,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error("Failed to store OTP:", insertError);
    return NextResponse.json(
      { error: "Failed to send OTP. Please try again." },
      { status: 500 },
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: `"EcoWise" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your EcoWise Verification Code",
      html: wrapBrand(`
        <p>Hi <b>${escapeHtml(name)}</b>,</p>
        <p>Your EcoWise verification code is:</p>
        <div style="background:#F0FDF4;border:1px solid #DAEDD5;border-radius:12px;padding:20px;text-align:center;margin:18px 0;">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1F8505;">${otp}</span>
        </div>
        <p style="color:#6E726E;">This code expires in 5 minutes.</p>
        <p style="color:#AAAAAA;font-size:12px;">If you didn't request this code, you can safely ignore this email.</p>
      `),
    });
  } catch (emailError) {
    console.error("Failed to send email:", emailError);
    await supabase.from("otp_verifications").delete().eq("email", email);
    return NextResponse.json(
      { error: "Failed to send verification email. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
