import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

interface EmailEnvelope {
  to: string;
  subject: string;
  html: string;
}

/**
 * Module-cached SMTP transporter. Nodemailer's `createTransport` opens
 * a fresh TLS handshake (~200-400ms) per call — fine for one-off sends
 * but expensive when a burst of signup OTPs / billing renewals all
 * fire within the same Node process. The transporter is keyed on the
 * `(user, pass)` pair so a credential rotation transparently swaps to
 * a new instance without us holding a stale connection.
 *
 * `pool: true` lets nodemailer reuse the underlying TCP connection
 * across messages; the modest concurrency caps prevent us from
 * tripping Gmail's per-account rate limits.
 */
let cachedTransporter: Transporter | null = null;
let cachedKey = "";

function getTransporter(user: string, pass: string): Transporter {
  const key = `${user}|${pass}`;
  if (cachedTransporter && cachedKey === key) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    auth: { user, pass },
  });
  cachedKey = key;
  return cachedTransporter;
}

/**
 * Send transactional email via the existing Gmail SMTP creds. Logs and
 * swallows errors — caller should treat email failure as non-fatal because
 * the source-of-truth state lives in the database.
 */
export async function sendEmail(envelope: EmailEnvelope): Promise<boolean> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("[emails] Gmail creds missing — skipping send", {
      to: envelope.to,
      subject: envelope.subject,
    });
    return false;
  }
  try {
    const transporter = getTransporter(
      process.env.GMAIL_USER,
      process.env.GMAIL_APP_PASSWORD,
    );
    await transporter.sendMail({
      from: `"EcoWise" <${process.env.GMAIL_USER}>`,
      to: envelope.to,
      subject: envelope.subject,
      html: envelope.html,
    });
    return true;
  } catch (err) {
    console.error("[emails] send failed", err);
    return false;
  }
}

// ── Templates ─────────────────────────────────────────────────────────────

/** Branded HTML wrap shared by all transactional emails. */
export function wrapBrand(body: string, opts?: { footer?: string }): string {
  const footer =
    opts?.footer ??
    "This is an automated message from EcoWise. Reply if you need help.";
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#F5FAF3;padding:24px 0;">
    <div style="max-width:540px;margin:0 auto;background:#fff;border:1px solid #DAEDD5;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(270deg,#79B669 0%,#1F8505 100%);padding:18px 24px;color:#fff;font-weight:700;letter-spacing:1px;">
        ECOWISE
      </div>
      <div style="padding:24px;color:#3B3D3B;line-height:1.55;font-size:14px;">
        ${body}
      </div>
      <div style="padding:14px 24px;background:#F0FDF4;color:#79B669;font-size:11px;border-top:1px solid #DAEDD5;">
        ${footer}
      </div>
    </div>
  </div>`;
}

const wrap = (body: string) => wrapBrand(body);

export function renewalSuccessEmail(opts: {
  planName: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  nextBilling: string;
}): { subject: string; html: string } {
  return {
    subject: `[EcoWise] Subscription renewed — ${opts.planName}`,
    html: wrap(`
      <p>Your <b>${opts.planName}</b> plan has been renewed.</p>
      <p>Amount charged: <b>${opts.amount.toFixed(2)} ${opts.currency}</b></p>
      <p>Invoice: <b>${opts.invoiceNumber}</b></p>
      <p>Next billing: <b>${opts.nextBilling}</b></p>
    `),
  };
}

export function renewalFailedEmail(opts: {
  planName: string;
  amount: number;
  currency: string;
  retryCount: number;
  nextRetry: string;
}): { subject: string; html: string } {
  return {
    subject: `[EcoWise] Renewal payment failed — ${opts.planName}`,
    html: wrap(`
      <p>We couldn't charge your card for the <b>${opts.planName}</b> plan.</p>
      <p>Amount due: <b>${opts.amount.toFixed(2)} ${opts.currency}</b></p>
      <p>Retry attempt: <b>${opts.retryCount}</b> of 3</p>
      <p>Next retry: <b>${opts.nextRetry}</b></p>
      <p>If we cannot complete the payment after 3 attempts your subscription will be canceled.</p>
    `),
  };
}

export function subscriptionCanceledEmail(opts: {
  planName: string;
  reason: "billing_failed" | "user_cancel" | "admin";
  endsOn?: string;
}): { subject: string; html: string } {
  const reasonText =
    opts.reason === "billing_failed"
      ? "after 3 failed payment attempts"
      : opts.reason === "admin"
        ? "by an administrator"
        : "as requested";
  const ends = opts.endsOn ? `<p>Access ends on <b>${opts.endsOn}</b>.</p>` : "";
  return {
    subject: `[EcoWise] Subscription canceled — ${opts.planName}`,
    html: wrap(`
      <p>Your <b>${opts.planName}</b> subscription has been canceled ${reasonText}.</p>
      ${ends}
      <p>You can subscribe again anytime from the billing page.</p>
    `),
  };
}

export function trialEndingEmail(opts: {
  planName: string;
  trialEnd: string;
}): { subject: string; html: string } {
  return {
    subject: `[EcoWise] Your trial ends soon — ${opts.planName}`,
    html: wrap(`
      <p>Your <b>${opts.planName}</b> trial ends on <b>${opts.trialEnd}</b>.</p>
      <p>Pick a paid plan or update your billing details to keep premium features.</p>
    `),
  };
}

/** Invite-to-org email sent when an Org Admin adds a brand-new user.
 * Includes a link to the forgot-password flow so the user can set their
 * own password — we never email a plaintext credential. */
export function orgInviteEmail(opts: {
  orgName: string;
  email: string;
  setupUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `[EcoWise] You've been added to ${opts.orgName}`,
    html: wrap(`
      <p>An administrator at <b>${opts.orgName}</b> has added <b>${opts.email}</b> to their EcoWise workspace.</p>
      <p>Set a password to activate your account:</p>
      <p>
        <a href="${opts.setupUrl}" style="display:inline-block;background:#1F8505;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">
          Set my password
        </a>
      </p>
      <p style="font-size:12px;color:#6E726E;">If the button doesn't work, open this link in your browser:<br/>${opts.setupUrl}</p>
    `),
  };
}
