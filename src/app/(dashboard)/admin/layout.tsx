import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/services/user.service";
import { Sidebar } from "../_components/Sidebar";
import { ADMIN_MENU_SECTIONS } from "./_config/menu";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <div className="ml-[222px]">
        <main className="px-9 py-[30px]">{children}</main>
      </div>
    </>
  );
}
