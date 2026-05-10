/**
 * EcoWise message codes (SRS §5.2).
 * Use these codes consistently in service / API responses so the UI layer
 * can map to translated user-facing text via i18n.
 *
 * Phase 0 introduces the codes referenced by Phase 0 / Phase 1 deliverables.
 * Additional codes will be added in subsequent phases.
 */
export const MSG = {
  // Generic
  REQUIRED_FIELD: "MSG01",
  INVALID_FORMAT: "MSG02",
  PASSWORD_INCORRECT: "MSG09",
  PUBLISHED_LOCK: "MSG12",
  SUBMISSION_SUCCESS: "MSG13",
  FILE_TOO_LARGE: "MSG19",
  PASSWORD_POLICY: "MSG20",
  DATE_RANGE: "MSG22",
  PASSWORD_MISMATCH: "MSG22B",
  SUBSCRIPTION_LIMIT_EMPLOYEES: "MSG24",
  SUBSCRIPTION_LIMIT_EVENTS: "MSG25",
  LAST_ADMIN_BLOCK: "MSG26",
  SUBSCRIPTION_CANCELLED: "MSG27",
  SUBSCRIPTION_SUSPENDED: "MSG28",
  ANTI_SPAM_LIMIT: "MSG30",

  // Phase 0 specific
  NOT_AUTHENTICATED: "AUTH_REQUIRED",
  NOT_SYSTEM_ADMIN: "FORBIDDEN_SYSTEM_ADMIN",
  NOT_ORG_MEMBER: "FORBIDDEN_ORG_MEMBER",
  NOT_ORG_ADMIN: "FORBIDDEN_ORG_ADMIN",
  AUDIT_LOG_IMMUTABLE: "AUDIT_LOG_IMMUTABLE",
} as const;

export type MessageCode = (typeof MSG)[keyof typeof MSG];

/**
 * Standard service / API response envelope.
 * Keep shape minimal: every layer can build on top of this.
 */
export interface ServiceResult<T> {
  ok: boolean;
  code?: MessageCode | string;
  message?: string;
  data?: T;
}

export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function fail(code: MessageCode | string, message?: string): ServiceResult<never> {
  return { ok: false, code, message };
}
