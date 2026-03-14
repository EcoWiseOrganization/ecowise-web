import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/services/user.service";
import { Sidebar } from "../_components/Sidebar";
import { USER_MENU_SECTIONS } from "./_config/menu";
import { getMyOrganizationsServer } from "@/app/actions/organization.actions";
import { WorkspaceProvider } from "../_context/WorkspaceContext";

export default async function IndividualLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [dbUser, organizations] = await Promise.all([
    getUserProfile(user!.id),
    getMyOrganizationsServer(),
  ]);

  const displayName =
    dbUser?.full_name ||
    dbUser?.user_name ||
    user!.user_metadata?.full_name ||
    user!.user_metadata?.name ||
    user!.email?.split("@")[0] ||
    "User";

  return (
    <WorkspaceProvider organizations={organizations}>
      <Sidebar
        userName={displayName}
        userRole="User"
        menuSections={USER_MENU_SECTIONS}
      />
      <div className="lg:ml-[222px]">
        <main className="px-4 sm:px-6 lg:px-9 pt-16 lg:pt-0 py-5 lg:py-[30px]">{children}</main>
      </div>
    </WorkspaceProvider>
  );
}
