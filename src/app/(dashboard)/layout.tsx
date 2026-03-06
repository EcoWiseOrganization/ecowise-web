import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "./_components/Sidebar";
import { Footer } from "@/components/shared/Footer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";
  const role = user.user_metadata?.role || "Sustainability Lead";

  return (
    <div className="min-h-screen bg-white">
      <Sidebar userName={displayName} userRole={role} />
      <div className="ml-[222px]">
        <main className="px-9 py-[30px]">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
