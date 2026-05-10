import { describe, it, expect } from "vitest";
import {
  decideLifecycleAction,
  MAX_RENEWAL_RETRIES,
  TRIAL_REMINDER_DAYS,
  terminalStatusForRetryCap,
} from "@/lib/subscription-lifecycle";
import type { Subscription } from "@/types/subscription.types";

const NOW = new Date("2026-05-11T12:00:00.000Z");

function sub(over: Partial<Subscription>): Pick<
  Subscription,
  | "status"
  | "current_period_end"
  | "trial_end"
  | "auto_renew"
  | "retry_count"
  | "trial_reminder_sent_at"
> {
  return {
    status: "Active",
    current_period_end: NOW.toISOString(),
    trial_end: null,
    auto_renew: true,
    retry_count: 0,
    trial_reminder_sent_at: null,
    ...over,
  } as Pick<
    Subscription,
    | "status"
    | "current_period_end"
    | "trial_end"
    | "auto_renew"
    | "retry_count"
    | "trial_reminder_sent_at"
  >;
}

describe("decideLifecycleAction", () => {
  it("force_terminate when PastDue + retries exhausted", () => {
    expect(
      decideLifecycleAction(
        sub({ status: "PastDue", retry_count: MAX_RENEWAL_RETRIES }),
        NOW
      )
    ).toBe("force_terminate");
  });

  it("renewal_due when period ended + auto_renew", () => {
    expect(
      decideLifecycleAction(
        sub({
          status: "Active",
          current_period_end: new Date(NOW.getTime() - 1000).toISOString(),
          auto_renew: true,
        }),
        NOW
      )
    ).toBe("renewal_due");
  });

  it("renewal_due also for PastDue (retries < cap)", () => {
    expect(
      decideLifecycleAction(
        sub({
          status: "PastDue",
          retry_count: 1,
          current_period_end: new Date(NOW.getTime() - 1000).toISOString(),
          auto_renew: true,
        }),
        NOW
      )
    ).toBe("renewal_due");
  });

  it("expire_canceled when period ended + auto_renew off", () => {
    expect(
      decideLifecycleAction(
        sub({
          status: "Active",
          current_period_end: new Date(NOW.getTime() - 1000).toISOString(),
          auto_renew: false,
        }),
        NOW
      )
    ).toBe("expire_canceled");
  });

  it("trial_reminder when trial ends within window + not yet sent", () => {
    const trialEnd = new Date(NOW.getTime() + 2 * 86_400_000).toISOString();
    expect(
      decideLifecycleAction(
        sub({
          status: "Trial",
          trial_end: trialEnd,
          current_period_end: new Date(NOW.getTime() + 30 * 86_400_000).toISOString(),
        }),
        NOW
      )
    ).toBe("trial_reminder");
  });

  it("no trial_reminder when already sent", () => {
    const trialEnd = new Date(NOW.getTime() + 2 * 86_400_000).toISOString();
    expect(
      decideLifecycleAction(
        sub({
          status: "Trial",
          trial_end: trialEnd,
          current_period_end: new Date(NOW.getTime() + 30 * 86_400_000).toISOString(),
          trial_reminder_sent_at: new Date(NOW.getTime() - 86_400_000).toISOString(),
        }),
        NOW
      )
    ).toBe("noop");
  });

  it("no trial_reminder when trial not within window", () => {
    const trialEnd = new Date(
      NOW.getTime() + (TRIAL_REMINDER_DAYS + 1) * 86_400_000
    ).toISOString();
    expect(
      decideLifecycleAction(
        sub({
          status: "Trial",
          trial_end: trialEnd,
          current_period_end: new Date(NOW.getTime() + 30 * 86_400_000).toISOString(),
        }),
        NOW
      )
    ).toBe("noop");
  });

  it("noop when active period still in future", () => {
    expect(
      decideLifecycleAction(
        sub({
          status: "Active",
          current_period_end: new Date(NOW.getTime() + 86_400_000).toISOString(),
        }),
        NOW
      )
    ).toBe("noop");
  });

  it("force_terminate beats renewal_due", () => {
    expect(
      decideLifecycleAction(
        sub({
          status: "PastDue",
          retry_count: MAX_RENEWAL_RETRIES,
          current_period_end: new Date(NOW.getTime() - 1000).toISOString(),
          auto_renew: true,
        }),
        NOW
      )
    ).toBe("force_terminate");
  });
});

describe("terminalStatusForRetryCap", () => {
  it("always Canceled", () => {
    expect(terminalStatusForRetryCap("Trial")).toBe("Canceled");
    expect(terminalStatusForRetryCap("Active")).toBe("Canceled");
    expect(terminalStatusForRetryCap("PastDue")).toBe("Canceled");
  });
});
