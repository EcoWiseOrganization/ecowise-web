import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getInvoice } from "@/services/subscription.service";
import { CheckoutView } from "@/components/billing/CheckoutView";
import type { PaymentIntent } from "@/types/subscription.types";

interface PageProps {
  params: Promise<{ intentId: string }>;
}

export default async function PersonalCheckoutPage({ params }: PageProps) {
  const { intentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = createServiceClient();
  const { data: intent } = await db
    .from("PaymentIntents")
    .select("*")
    .eq("id", intentId)
    .maybeSingle();
  if (!intent) notFound();

  const invoice = await getInvoice(intent.invoice_id);
  if (!invoice || invoice.subject_type !== "User" || invoice.subject_id !== user.id) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4 pt-6">
      <h1 className="text-[#155A03] text-xl font-bold">Complete payment</h1>
      <CheckoutView
        intent={intent as PaymentIntent}
        invoice={invoice}
        successHref={`/dashboard/billing/invoices/${invoice.id}`}
      />
    </div>
  );
}
