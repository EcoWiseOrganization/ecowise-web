import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { listContactMessages } from "@/services/admin-orgs.service";
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
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="text-[#155A03] text-2xl font-bold">Contact Messages</h1>
        <p className="text-sm text-[#6E726E]">
          Public submissions from the /contact form (rate-limited).
        </p>
      </div>
      <ContactMessagesView initial={data} />
    </div>
  );
}
