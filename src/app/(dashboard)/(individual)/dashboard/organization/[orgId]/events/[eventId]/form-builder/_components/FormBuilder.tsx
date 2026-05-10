"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  rotateEventFormTokenAction,
  upsertEventFormAction,
} from "@/app/actions/event-form.actions";
import { QrCode } from "@/components/ui/QrCode";
import type {
  EventPublicForm,
  EventPublicFormStatus,
  EventPublicSubmission,
} from "@/types/event-form.types";

interface Props {
  orgId: string;
  eventId: string;
  initial: EventPublicForm | null;
  initialSubmissions: EventPublicSubmission[];
  publicBaseUrl: string;
}

export function FormBuilder({
  orgId,
  eventId,
  initial,
  initialSubmissions,
  publicBaseUrl,
}: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<EventPublicForm | null>(initial);
  const [submissions] = useState(initialSubmissions);
  const [welcome, setWelcome] = useState(initial?.welcome_message ?? "");
  const [color, setColor] = useState(initial?.brand_color ?? "#1F8505");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const publicUrl = form ? `${publicBaseUrl}/event-form/${form.token}` : null;

  const submit = (status: EventPublicFormStatus) => {
    setStatusMsg(null);
    startTransition(async () => {
      const res = await upsertEventFormAction(orgId, eventId, {
        welcome_message: welcome,
        brand_color: color,
        status,
      });
      if (res.error || !res.data) {
        setStatusMsg(`error.${res.error ?? "unknown"}`);
        return;
      }
      setForm(res.data);
      setStatusMsg(
        status === "Published"
          ? "publicForm.builder.published"
          : "publicForm.builder.saved"
      );
    });
  };

  const rotate = () => {
    setStatusMsg(null);
    startTransition(async () => {
      const res = await rotateEventFormTokenAction(orgId, eventId);
      if (res.error || !res.data) {
        setStatusMsg(`error.${res.error ?? "unknown"}`);
        return;
      }
      setForm(res.data);
      setStatusMsg("publicForm.builder.rotated");
    });
  };

  const copy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setStatusMsg("publicForm.builder.copied");
    } catch {
      setStatusMsg("error.unknown");
    }
  };

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#155A03] text-lg font-semibold">
            {t("publicForm.builder.title")}
          </h2>
          <p className="text-sm text-[#6E726E]">
            {t("publicForm.builder.subtitle")}
          </p>
        </div>
        <Link
          href={`/dashboard/organization/${orgId}/events/${eventId}`}
          className="text-sm text-[#1F8505] hover:underline"
        >
          ← {t("publicForm.builder.backToEvent")}
        </Link>
      </div>

      {statusMsg && (
        <div
          className={`rounded-lg p-3 text-sm ${
            statusMsg.startsWith("error")
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-green-50 border border-green-200 text-green-700"
          }`}
        >
          {t(statusMsg, { defaultValue: statusMsg })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customization */}
        <section className="lg:col-span-2 bg-white border border-[#DAEDD5] rounded-2xl p-6 space-y-4">
          <h3 className="text-[#155A03] font-semibold">
            {t("publicForm.builder.customize")}
          </h3>

          <Field label={t("publicForm.builder.welcome")}>
            <textarea
              value={welcome}
              onChange={(e) => setWelcome(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm resize-none"
              placeholder={t("publicForm.builder.welcomePlaceholder")}
            />
          </Field>

          <Field label={t("publicForm.builder.brandColor")}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-10 border border-[#E5E7EB] rounded"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm font-mono"
                maxLength={7}
              />
            </div>
          </Field>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => submit("Draft")}
              disabled={pending}
              className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium disabled:opacity-50"
            >
              {t("publicForm.builder.saveDraft")}
            </button>
            <button
              type="button"
              onClick={() => submit("Published")}
              disabled={pending}
              className="px-4 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold disabled:opacity-50"
            >
              {t("publicForm.builder.publish")}
            </button>
            {form && (
              <>
                <button
                  type="button"
                  onClick={() => submit("Closed")}
                  disabled={pending}
                  className="px-4 py-2 rounded-lg border border-orange-300 text-orange-700 text-sm font-medium disabled:opacity-50"
                >
                  {t("publicForm.builder.close")}
                </button>
                <button
                  type="button"
                  onClick={rotate}
                  disabled={pending}
                  className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-medium disabled:opacity-50"
                >
                  {t("publicForm.builder.rotateToken")}
                </button>
              </>
            )}
          </div>

          <div className="text-xs text-[#AAAAAA]">
            {t("publicForm.builder.fieldsHint")}
          </div>
        </section>

        {/* Live link / QR */}
        <aside className="bg-white border border-[#DAEDD5] rounded-2xl p-6 space-y-3">
          <h3 className="text-[#155A03] font-semibold">
            {t("publicForm.builder.publicLink")}
          </h3>
          {form && publicUrl ? (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-[#6E726E]">
                  {t("publicForm.builder.status")}:{" "}
                  <b
                    className={
                      form.status === "Published"
                        ? "text-[#1F8505]"
                        : form.status === "Draft"
                          ? "text-orange-700"
                          : "text-gray-500"
                    }
                  >
                    {form.status}
                  </b>
                </span>
                <input
                  readOnly
                  value={publicUrl}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs bg-gray-50 font-mono"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copy}
                    className="flex-1 px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium hover:bg-gray-50"
                  >
                    {t("publicForm.builder.copy")}
                  </button>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center px-3 py-2 rounded-lg border border-[#DAEDD5] text-[#1F8505] text-xs font-medium hover:bg-[#f0f9ed]"
                  >
                    {t("publicForm.builder.openLink")}
                  </a>
                </div>
              </div>
              <div className="flex justify-center pt-2">
                <QrCode value={publicUrl} size={180} />
              </div>
            </>
          ) : (
            <p className="text-sm text-[#AAAAAA]">
              {t("publicForm.builder.notYet")}
            </p>
          )}
        </aside>
      </div>

      {/* Recent submissions */}
      <section className="bg-white border border-[#DAEDD5] rounded-2xl p-6">
        <h3 className="text-[#155A03] font-semibold mb-3">
          {t("publicForm.builder.recentSubmissions", { count: submissions.length })}
        </h3>
        {submissions.length === 0 ? (
          <p className="text-sm text-[#AAAAAA]">
            {t("publicForm.builder.noSubmissions")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[#6E726E] text-xs uppercase">
                <tr className="border-b border-gray-100">
                  <th className="px-2 py-2">{t("publicForm.col.when")}</th>
                  <th className="px-2 py-2">{t("publicForm.col.email")}</th>
                  <th className="px-2 py-2">{t("publicForm.col.transport")}</th>
                  <th className="px-2 py-2">{t("publicForm.col.co2e")}</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-2 py-2 text-xs">
                      {new Date(s.created_at).toLocaleString()}
                    </td>
                    <td className="px-2 py-2">
                      {s.submitted_by_email ?? "—"}
                    </td>
                    <td className="px-2 py-2">
                      {String(
                        (s.submitted_data as Record<string, unknown>)
                          ?.transport_mode ?? "—"
                      )}
                    </td>
                    <td className="px-2 py-2 font-semibold text-[#155A03]">
                      {(Number(s.computed_co2e) || 0).toFixed(2)} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[#6E726E] mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
