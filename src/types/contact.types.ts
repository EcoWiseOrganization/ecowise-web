export type ContactMessageStatus = "new" | "read" | "archived" | "spam";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: ContactMessageStatus;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface CreateContactMessageInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
}
