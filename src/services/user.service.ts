import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@/types/user.types";

/**
 * Returns true if the email is registered in Supabase Auth
 * exclusively via Google OAuth (no email/password identity).
 */
export async function checkIsGoogleOnlyAccount(email: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({
      filter: email,
      perPage: 10,
    });
    if (error || !data?.users?.length) return false;
    const user = data.users.find((u) => u.email === email);
    if (!user) return false;
    const providers = (user.identities ?? []).map((id) => id.provider);
    // Google-only: has at least one identity, all of them are "google"
    return providers.length > 0 && providers.every((p) => p === "google");
  } catch {
    return false;
  }
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("User")
    .select("user_name, full_name")
    .eq("id", userId)
    .single();

  return data;
}

export async function getIsAdmin(userId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("User")
    .select("is_admin")
    .eq("id", userId)
    .single();

  return data?.is_admin === true;
}

export async function getDashboardPath(userId: string) {
  const isAdmin = await getIsAdmin(userId);
  return isAdmin ? "/admin" : "/dashboard";
}

export async function getUserStats() {
  const supabase = createAdminClient();

  const [
    { count: totalUsers },
    { count: adminCount },
    { count: activeCount },
  ] = await Promise.all([
    supabase.from("User").select("*", { count: "exact", head: true }),
    supabase
      .from("User")
      .select("*", { count: "exact", head: true })
      .eq("is_admin", true),
    supabase
      .from("User")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  return {
    totalUsers: totalUsers ?? 0,
    adminCount: adminCount ?? 0,
    activeCount: activeCount ?? 0,
  };
}

export async function getAllUsers(): Promise<User[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("User")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return data ?? [];
}
