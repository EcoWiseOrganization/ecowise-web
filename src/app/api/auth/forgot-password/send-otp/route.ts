import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Check if user exists
  const adminClient = createAdminClient();
  const { data: users, error: listError } = await adminClient.auth.admin.listUsers();

  if (listError) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  const userExists = users.users.some((u) => u.email === email);
  if (!userExists) {
    return NextResponse.json({ error: "No account found with this email address" }, { status: 404 });
  }

  // Generate 4-digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const supabase = await createClient();

  // Delete any existing OTP for this email
  await supabase.from("otp_verifications").delete().eq("email", email);

  const { error: insertError } = await supabase.from("otp_verifications").insert({
    email,
    otp,
    expires_at: expiresAt,
  });

  if (insertError) {
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
      subject: "Your EcoWise Password Reset Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1F8505; margin-bottom: 16px;">Password Reset</h2>
          <p style="color: #3B3D3B; font-size: 16px;">You requested to reset your password.</p>
          <p style="color: #3B3D3B; font-size: 16px;">Your verification code is:</p>
          <div style="background: #F0FDF4; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1F8505;">${otp}</span>
          </div>
          <p style="color: #6E726E; font-size: 14px;">This code expires in 5 minutes.</p>
          <p style="color: #6E726E; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch {
    await supabase.from("otp_verifications").delete().eq("email", email);
    return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
