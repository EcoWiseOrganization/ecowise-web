"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { useToast } from "@/components/ui/Toast";
import { requestPlanUpgradeAction } from "@/app/actions/upgrade-request.actions";
import { formatVnd } from "@/lib/format-number";
import type {
  SubscriptionPlan,
  SubscriptionSubjectType,
} from "@/types/subscription.types";

interface Props {
  plan: SubscriptionPlan;
  subjectType: SubscriptionSubjectType;
  subjectId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

/**
 * Bank-transfer upgrade modal. Shows the static VietQR code (public/qr.jpg)
 * plus a transfer reference the user should put in the bank memo, then files a
 * PlanUpgradeRequest for a System Admin to approve.
 */
export function UpgradePlanModal({
  plan,
  subjectType,
  subjectId,
  onClose,
  onSubmitted,
}: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  // Slide / fade-in to match the rest of the app's modals.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Stable reference for the bank memo so an admin can correlate the incoming
  // transfer with this request. Short + greppable.
  const transferNote = `ECOWISE ${plan.plan_code} ${subjectId.slice(0, 8).toUpperCase()}`;

  const copyNote = async () => {
    try {
      await navigator.clipboard.writeText(transferNote);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — the value is visible on screen anyway.
    }
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await requestPlanUpgradeAction({
        subjectType,
        subjectId,
        planId: plan.id,
        transferNote,
      });
      if (res.error || !res.data) {
        setError(res.error ?? "unknown");
        showToast(t("upgrade.modal.submitError"), "error");
        return;
      }
      showToast(t("upgrade.modal.submitSuccess"), "success");
      onSubmitted();
    });
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("upgrade.modal.title")}
        className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-200 ${
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-2"
        }`}
      >
        {/* Header — brand gradient */}
        <div className="relative bg-[linear-gradient(135deg,#1F8505_0%,#2D6A4F_55%,#1B4332_100%)] px-6 pt-6 pb-14 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.cancel")}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors border-none cursor-pointer text-white"
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
          <p className="text-xs uppercase tracking-[1.5px] text-white/80">
            {t("upgrade.modal.eyebrow")}
          </p>
          <h2 className="text-2xl font-bold mt-1 leading-tight">
            {plan.plan_name}
          </h2>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold">
              {formatVnd(Number(plan.base_price_usd))}
            </span>
            <span className="text-sm text-white/80">
              / {t(`billing.cycle.${plan.billing_cycle}`)}
            </span>
          </div>
        </div>

        {/* QR card — pulled up to overlap the header for a "ticket" feel */}
        <div className="px-6 -mt-10">
          <div className="bg-white rounded-2xl shadow-[0_10px_40px_-12px_rgba(31,133,5,0.45)] border border-[#DAEDD5] p-3">
            <div className="relative w-full aspect-[3/5] max-h-[360px] rounded-xl overflow-hidden">
              <Image
                src="/qr.jpg"
                alt={t("upgrade.modal.qrAlt")}
                fill
                sizes="(max-width: 480px) 90vw, 400px"
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>

        {/* Instructions + reference */}
        <div className="px-6 pt-4 pb-6 flex flex-col gap-3">
          <p className="text-sm text-[#3B3D3B] leading-relaxed">
            {t("upgrade.modal.instructions")}
          </p>

          {/* Transfer reference (bank memo) */}
          <div className="flex items-center justify-between gap-2 bg-[#F0FDF4] border border-[#DAEDD5] rounded-xl px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-[#6E726E]">
                {t("upgrade.modal.referenceLabel")}
              </p>
              <p className="text-sm font-mono font-semibold text-[#155A03] truncate">
                {transferNote}
              </p>
            </div>
            <button
              type="button"
              onClick={copyNote}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#DAEDD5] text-[#1F8505] text-xs font-semibold hover:bg-[#f0f9ed] cursor-pointer"
            >
              {copied ? (
                <CheckIcon sx={{ fontSize: 15 }} />
              ) : (
                <ContentCopyIcon sx={{ fontSize: 15 }} />
              )}
              {copied ? t("upgrade.modal.copied") : t("upgrade.modal.copy")}
            </button>
          </div>

          <p className="text-xs text-[#6E726E] leading-relaxed">
            {t("upgrade.modal.approvalNotice")}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700">
              {t(`error.${error}`, { defaultValue: error })}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#DAEDD5] text-[#6E726E] text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="flex-[1.4] px-4 py-2.5 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-bold hover:shadow-md disabled:opacity-50 cursor-pointer"
            >
              {pending ? t("upgrade.modal.submitting") : t("upgrade.modal.confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
