import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listInvoices } from "@/services/subscription.service";
import { InvoiceList } from "@/components/billing/InvoiceList";
import { T } from "@/components/shared/TranslatedText";

export default async function PersonalInvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const invoices = await listInvoices("User", user.id);

  return (
    <div className="flex flex-col gap-4 pt-6">
      <h1 className="text-[#155A03] text-xl font-bold">
        <T k="billing.invoices.title" />
      </h1>
      <InvoiceList invoices={invoices} detailBase="/dashboard/billing/invoices" />
    </div>
  );
}
