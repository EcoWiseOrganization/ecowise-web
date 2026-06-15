export type SubscriptionTarget = "B2B" | "B2C";
export type SubscriptionBillingCycle = "Monthly" | "Annual";
export type SubscriptionPlanStatus = "Active" | "Inactive";
export type SubscriptionSubjectType = "Org" | "User";
export type SubscriptionStatus =
  | "Trial"
  | "Active"
  | "PastDue"
  | "Canceled"
  | "Suspended";
export type InvoiceStatus =
  | "PendingPayment"
  | "Paid"
  | "PastDue"
  | "Refunded"
  | "Voided";
export type PaymentIntentStatus = "Pending" | "Paid" | "Failed" | "Expired";

export interface PlanFeature {
  key: string;
  label: string;
}

export interface SubscriptionPlan {
  id: string;
  plan_code: string;
  plan_name: string;
  target_customer: SubscriptionTarget;
  base_price_usd: number;
  billing_cycle: SubscriptionBillingCycle;
  trial_days: number;
  max_users: number | null;
  max_events: number | null;
  features: PlanFeature[];
  status: SubscriptionPlanStatus;
  created_at: string;
  updated_at: string;
}

export interface UpsertSubscriptionPlanInput {
  plan_code: string;
  plan_name: string;
  target_customer: SubscriptionTarget;
  base_price_usd: number;
  billing_cycle: SubscriptionBillingCycle;
  trial_days?: number;
  max_users?: number | null;
  max_events?: number | null;
  features?: PlanFeature[];
  status?: SubscriptionPlanStatus;
}

export interface Subscription {
  id: string;
  subject_type: SubscriptionSubjectType;
  subject_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  auto_renew: boolean;
  retry_count: number;
  canceled_at: string | null;
  billing_email: string | null;
  billing_company_name: string | null;
  billing_address: string | null;
  billing_vat_id: string | null;
  // Phase 8 — lifecycle (migration 013)
  cancel_reason: string | null;
  cancel_feedback: string | null;
  last_renewal_attempt_at: string | null;
  last_renewal_error: string | null;
  trial_reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface SubscriptionWithPlan extends Subscription {
  plan: SubscriptionPlan;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id: string;
  subscription_id: string | null;
  invoice_number: string;
  subject_type: SubscriptionSubjectType;
  subject_id: string;
  billing_reason: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  line_items: InvoiceLineItem[];
  pdf_url: string | null;
  created_at: string;
}

export interface PaymentIntent {
  id: string;
  invoice_id: string;
  provider: string;
  qr_payload: string | null;
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  expires_at: string;
  paid_at: string | null;
  created_at: string;
}

export interface SubscriptionUsage {
  activeUsers: number;
  totalEvents: number;
  maxUsers: number | null;
  maxEvents: number | null;
}

export interface BillingInfoInput {
  billing_email?: string;
  billing_company_name?: string;
  billing_address?: string;
  billing_vat_id?: string;
}

// ── Manual plan-upgrade requests (bank-transfer / QR flow) ──────────────────

export type PlanUpgradeRequestStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Canceled";

export interface PlanUpgradeRequest {
  id: string;
  subject_type: SubscriptionSubjectType;
  subject_id: string;
  plan_id: string;
  current_plan_id: string | null;
  status: PlanUpgradeRequestStatus;
  amount: number;
  currency: string;
  transfer_note: string | null;
  requested_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  resulting_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Upgrade request joined with plan rows + requester identity for the
 *  admin review queue. */
export interface PlanUpgradeRequestWithDetails extends PlanUpgradeRequest {
  plan: SubscriptionPlan | null;
  current_plan: SubscriptionPlan | null;
  requester_email: string | null;
  requester_name: string | null;
  subject_label: string | null;
}
