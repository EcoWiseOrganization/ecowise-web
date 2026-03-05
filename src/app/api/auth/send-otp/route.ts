import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

  // Check if email already exists in Supabase
  const supabase = await createClient();
  // We can't directly check if a user exists without signing up,
  // so we'll check during verify-otp. For now, proceed with OTP.

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
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1F8505; margin-bottom: 16px;">EcoWise Verification</h2>
          <p style="color: #3B3D3B; font-size: 16px;">Hi ${name},</p>
          <p style="color: #3B3D3B; font-size: 16px;">Your verification code is:</p>
          <div style="background: #F0FDF4; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1F8505;">${otp}</span>
          </div>
          <p style="color: #6E726E; font-size: 14px;">This code expires in 5 minutes.</p>
          <p style="color: #6E726E; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Failed to send email:", emailError);
    // Clean up the OTP record
    await supabase.from("otp_verifications").delete().eq("email", email);
    return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
