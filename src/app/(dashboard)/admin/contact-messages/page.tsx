import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { listContactMessages } from "@/services/admin-orgs.service";
import { PageHeader } from "../_components/PageHeader";
import { ContactMessagesView } from "./_components/ContactMessagesView";

export default async function AdminContactMessagesPage() {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }
  const data = await listContactMessages();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titleKey="admin.contactMessages.title"
        subtitleKey="admin.contactMessages.subtitle"
      />
      <ContactMessagesView initial={data} />
    </div>
  );
}
