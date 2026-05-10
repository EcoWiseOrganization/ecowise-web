import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkIsGoogleOnlyAccount } from "@/services/user.service";
import { wrapBrand } from "@/lib/emails";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  const { name, email, password } = await request.json();

  // Validate fields
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

  // Generate 4-digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  // Store OTP in Supabase
  // First, delete any existing OTP for this email
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
        <p>Hi <b>${name}</b>,</p>
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
