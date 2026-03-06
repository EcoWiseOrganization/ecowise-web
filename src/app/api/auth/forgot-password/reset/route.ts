import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { email, password, resetToken } = await request.json();

  if (!email || !password || !resetToken) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify reset token
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

  // Find user by email and update password using admin client
  const adminClient = createAdminClient();
  const { data: users, error: listError } = await adminClient.auth.admin.listUsers();

  if (listError) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  const user = users.users.find((u) => u.email === email);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
    password,
  });

  if (updateError) {
    return NextResponse.json({ error: "Failed to reset password. Please try again." }, { status: 500 });
  }

  // Clean up reset token
  await supabase.from("password_reset_tokens").delete().eq("email", email);

  return NextResponse.json({ success: true });
}
