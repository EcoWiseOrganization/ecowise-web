import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserByEmail } from "@/services/user.service";
import { normaliseEmail } from "@/lib/otp";

/**
 * Forgot-password — set new password.
 *
 * Reads the reset token from the HTTP-only `ecowise.reset_token` cookie
 * that `/verify-otp` set on the prior step. The client only sends the
 * new password + email in the body; the token never lives in JS-readable
 * storage. The cookie is cleared on success.
 *
 * As a hardening step, after a successful password change we call
 * `auth.admin.signOut(user.id, 'global')` so any other sessions belonging
 * to the user — including the one a stealer may have established with
 * the previous password — are invalidated.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = normaliseEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  const resetToken = request.cookies.get("ecowise.reset_token")?.value ?? "";

  if (!email || !password || !resetToken) {
    return NextResponse.json({ error: "Invalid or expired reset session. Please start over." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: tokenRecord, error: fetchError } = await supabase
    .from("password_reset_tokens")
    .select("*")
    .eq("email", email)
    .eq("token", resetToken)
    .single();

  if (fetchError || !tokenRecord) {
    return NextResponse.json({ error: "Invalid or expired reset session. Please start over." }, { status: 400 });
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    await supabase.from("password_reset_tokens").delete().eq("email", email);
    return NextResponse.json({ error: "Reset session has expired. Please start over." }, { status: 400 });
  }

  // Paginated lookup — see findAuthUserByEmail in user.service. The old
  // single-page `listUsers()` silently missed users past index 1000,
  // so resets for those accounts would never find the auth row.
  const user = await getAuthUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const adminClient = createAdminClient();

  const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
    password,
  });

  if (updateError) {
    return NextResponse.json({ error: "Failed to reset password. Please try again." }, { status: 500 });
  }

  // Invalidate every existing session — a compromised session must not
  // survive a password reset.
  try {
    await adminClient.auth.admin.signOut(user.id, "global");
  } catch (signOutErr) {
    console.warn("[forgot-password/reset] signOut(global) failed", signOutErr);
  }

  await supabase.from("password_reset_tokens").delete().eq("email", email);

  const response = NextResponse.json({ success: true });
  response.cookies.set("ecowise.reset_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/forgot-password",
    maxAge: 0,
  });
  return response;
}
