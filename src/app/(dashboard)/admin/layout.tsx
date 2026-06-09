import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/services/user.service";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { Sidebar } from "../_components/Sidebar";
import { ADMIN_MENU_SECTIONS } from "./_config/menu";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defence-in-depth: middleware already redirects non-admins away from
  // /admin/*, but server actions and direct fetches don't traverse
  // middleware. Enforcing in the layout makes the gate explicit and
  // protects every page inside this segment from one place — beats
  // sprinkling `requireSystemAdmin()` across each page.
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) {
      // Not signed in → /login; signed-in non-admin → home.
      redirect(err.code === "AUTH_REQUIRED" ? "/login" : "/dashboard");
    }
    throw err;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dbUser = await getUserProfile(user!.id);

  const displayName =
    dbUser?.full_name ||
    dbUser?.user_name ||
    user!.user_metadata?.full_name ||
    user!.user_metadata?.name ||
    user!.email?.split("@")[0] ||
    "User";

  return (
    <>
      <Sidebar
        userName={displayName}
        userRole="Admin"
        menuSections={ADMIN_MENU_SECTIONS}
        showWorkspace={false}
      />
      <div className="lg:ml-[222px]">
        <main className="px-4 sm:px-6 lg:px-9 pt-16 lg:pt-0 py-5 lg:py-[30px]">{children}</main>
      </div>
    </>
  );
}
