import { createClient } from "@/lib/supabase/server";
import { DeleteAccountForm } from "./_components/DeleteAccountForm";

export default async function DangerSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <DeleteAccountForm email={user?.email ?? ""} />;
}
