import type { FormFieldDescriptor } from "@/lib/event-form";

export type EventPublicFormStatus = "Draft" | "Published" | "Closed";

export interface EventPublicForm {
  id: string;
  event_id: string;
  org_id: string;
  token: string;
  fields: FormFieldDescriptor[];
  welcome_message: string | null;
  brand_color: string | null;
  status: EventPublicFormStatus;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface EventPublicSubmission {
  id: string;
  form_id: string;
  event_id: string;
  org_id: string;
  submitted_by_email: string | null;
  submitted_data: Record<string, unknown>;
  computed_co2e: number | null;
  emission_log_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface UpsertEventPublicFormInput {
  welcome_message?: string;
  brand_color?: string;
  status?: EventPublicFormStatus;
  /** Optional override of the default field list. */
  fields?: FormFieldDescriptor[];
}
