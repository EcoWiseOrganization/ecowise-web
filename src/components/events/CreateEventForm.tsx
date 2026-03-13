"use client";

import { useState } from "react";
import EventIcon from "@mui/icons-material/Event";
import { useTranslation } from "react-i18next";
import {
  useCreateEvent,
  EVENT_TYPE_OPTIONS,
  EVENT_STATUS_OPTIONS,
} from "@/hooks/useCreateEvent";
import type { CreateEventInput, EventType, EventStatus } from "@/types/event.types";
import { useToast } from "@/components/ui/Toast";

function FieldLabel({ htmlFor, children, required = false }: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="text-[#141514] text-sm font-medium leading-5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-red-600 text-xs mt-1">{message}</p>;
}

const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-[#DAEDD5] bg-white text-[#141514] " +
  "text-sm placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#79B669] " +
  "focus:ring-2 focus:ring-[#79B669]/20 transition-colors";

const selectCls = inputCls + " cursor-pointer appearance-none";

interface CreateEventFormProps {
  orgId: string;
  userId: string;
  onSuccess?: (event: import("@/types/event.types").Event) => void;
  onCancel?: () => void;
}

export function CreateEventForm({ orgId, userId, onSuccess, onCancel }: CreateEventFormProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { loading, errors, generalError, handleSubmit, clearErrors } = useCreateEvent();

  const [values, setValues] = useState<Omit<CreateEventInput, "org_id">>({
    name: "",
    event_type: "" as EventType,
    status: "" as EventStatus,
    start_date: "",
    end_date: "",
  });

  const set = (field: keyof Omit<CreateEventInput, "org_id">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
      clearErrors();
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit({ ...values, org_id: orgId }, userId, (event) => {
      showToast(`${t("event.createTitle")}: "${event.name}" ✓`, "success");
      onSuccess?.(event);
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#f0f9ed] flex items-center justify-center shrink-0">
          <EventIcon sx={{ fontSize: 20, color: "#1F8505" }} />
        </div>
        <div>
          <h2 className="text-[#155A03] text-lg font-semibold leading-6">
            {t("event.createTitle")}
          </h2>
          <p className="text-[#AAAAAA] text-xs">{t("form.requiredHint")}</p>
        </div>
      </div>

      {generalError && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {generalError}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="event-name" required>{t("event.form.name")}</FieldLabel>
        <input
          id="event-name"
          type="text"
          placeholder={t("event.form.namePlaceholder")}
          value={values.name}
          onChange={set("name")}
          className={inputCls}
          maxLength={200}
        />
        <FieldError message={errors.name} />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="event-type" required>{t("event.form.type")}</FieldLabel>
        <div className="relative">
          <select
            id="event-type"
            value={values.event_type}
            onChange={set("event_type")}
            className={selectCls}
          >
            <option value="" disabled>{t("event.form.typePlaceholder")}</option>
            {EVENT_TYPE_OPTIONS.map(({ value, labelKey }) => (
              <option key={value} value={value}>{t(labelKey)}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#79B669]">▾</span>
        </div>
        <FieldError message={errors.event_type} />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="event-status" required>{t("event.form.status")}</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {EVENT_STATUS_OPTIONS.map(({ value, labelKey }) => {
            const active = values.status === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => { setValues((prev) => ({ ...prev, status: value })); clearErrors(); }}
                className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                  active
                    ? "border-[#1F8505] bg-[#f0f9ed] text-[#1F8505]"
                    : "border-[#DAEDD5] text-[#3B3D3B] hover:border-[#79B669]"
                }`}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>
        <FieldError message={errors.status} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="start-date" required>{t("event.form.startDate")}</FieldLabel>
          <input id="start-date" type="date" value={values.start_date} onChange={set("start_date")} className={inputCls} />
          <FieldError message={errors.start_date} />
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="end-date" required>{t("event.form.endDate")}</FieldLabel>
          <input id="end-date" type="date" value={values.end_date} min={values.start_date || undefined} onChange={set("end_date")} className={inputCls} />
          <FieldError message={errors.end_date} />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-5 py-2.5 rounded-xl border border-[#DAEDD5] text-[#3B3D3B] text-sm font-medium hover:bg-[#f5f5f5] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {t("common.cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-5 py-2.5 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? t("common.creating") : t("event.createTitle")}
        </button>
      </div>
    </form>
  );
}
