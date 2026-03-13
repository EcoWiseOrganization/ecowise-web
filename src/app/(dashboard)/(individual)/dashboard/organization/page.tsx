import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMyOrganizationsServer } from "@/app/actions/organization.actions";
import { OrganizationsView } from "./_components/OrganizationsView";

export const metadata = { title: "Organizations – EcoWise" };

export default async function OrganizationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const organizations = await getMyOrganizationsServer();

  return (
    <div className="flex flex-col gap-6 pt-6">
      <OrganizationsView initialOrgs={organizations} userId={user.id} />
    </div>
  );
}
