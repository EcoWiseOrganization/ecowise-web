import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@/types/user.types";

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
