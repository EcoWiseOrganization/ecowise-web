import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkIsGoogleOnlyAccount } from "@/services/user.service";
import { wrapBrand } from "@/lib/emails";
import { generateOtp, normaliseEmail, otpExpiry } from "@/lib/otp";
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

export async function POST(request: Request) {
  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = normaliseEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!name || !email || !password) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  // Check if email is registered as Google-only — fail early before sending OTP
  const isGoogleOnly = await checkIsGoogleOnlyAccount(email);
  if (isGoogleOnly) {
    return NextResponse.json({ error: "GOOGLE_ACCOUNT_ONLY" }, { status: 400 });
  }

  const supabase = await createClient();

  // 6-digit cryptographically random OTP; replaces Math.random + 4 digits.
  const otp = generateOtp();
  const expiresAt = otpExpiry();

  // Replace any in-flight OTP for this email; failed_attempts resets to 0
  // via the column default on insert.
  await supabase.from("otp_verifications").delete().eq("email", email);

  const { error: insertError } = await supabase.from("otp_verifications").insert({
    email,
    otp,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error("Failed to store OTP:", insertError);
    return NextResponse.json({ error: "Failed to send OTP. Please try again." }, { status: 500 });
  }

  // Send OTP via email
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
    // Clean up the OTP record
    await supabase.from("otp_verifications").delete().eq("email", email);
    return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
