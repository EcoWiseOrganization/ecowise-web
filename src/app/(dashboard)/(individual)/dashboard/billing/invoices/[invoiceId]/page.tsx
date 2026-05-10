import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveIntentForInvoice,
  getInvoice,
} from "@/services/subscription.service";
import { InvoiceDetail } from "@/components/billing/InvoiceDetail";

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

export default async function PersonalInvoiceDetailPage({ params }: PageProps) {
  const { invoiceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const invoice = await getInvoice(invoiceId);
  if (!invoice || invoice.subject_type !== "User" || invoice.subject_id !== user.id) {
    notFound();
  }
  const intent = await getActiveIntentForInvoice(invoiceId);

  return (
    <div className="pt-6">
      <InvoiceDetail
        invoice={invoice}
        intent={intent}
        backHref="/dashboard/billing/invoices"
        checkoutBase="/dashboard/billing/checkout"
      />
    </div>
  );
}
