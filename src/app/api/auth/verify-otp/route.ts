import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkIsGoogleOnlyAccount } from "@/services/user.service";

export async function POST(request: Request) {
  const { email, otp, name, password } = await request.json();

  if (!email || !otp || !name || !password) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Look up the OTP record
  const { data: otpRecord, error: fetchError } = await supabase
    .from("otp_verifications")
    .select("*")
    .eq("email", email)
    .eq("otp", otp)
    .single();

  if (fetchError || !otpRecord) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
  }

  // Check expiry
  if (new Date(otpRecord.expires_at) < new Date()) {
    await supabase.from("otp_verifications").delete().eq("email", email);
    return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
  }

  // OTP is valid — double-check for Google-only account before creating user
  const isGoogleOnly = await checkIsGoogleOnlyAccount(email);
  if (isGoogleOnly) {
    await supabase.from("otp_verifications").delete().eq("email", email);
    return NextResponse.json({ error: "GOOGLE_ACCOUNT_ONLY" }, { status: 400 });
  }

  // Create the Supabase user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
    },
  });

  if (signUpError) {
    const msg = signUpError.message.toLowerCase().includes("already registered")
      ? "An account with this email already exists. Please sign in instead."
      : signUpError.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Check for duplicate email (empty identities)
  if (signUpData.user?.identities && signUpData.user.identities.length === 0) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
  }

  // Confirm the user's email via admin so Supabase treats it as verified.
  // This is required for Google OAuth auto-linking to work:
  // Supabase only links a Google identity to an existing account when
  // that account's email is confirmed.
  if (signUpData.user?.id) {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(signUpData.user.id, {
      email_confirm: true,
    });
  }

  // Clean up OTP record
  await supabase.from("otp_verifications").delete().eq("email", email);

  return NextResponse.json({ success: true });
}
