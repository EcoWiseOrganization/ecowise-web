"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  estimateCo2eKg,
  type Diet,
  type PublicFormSubmission,
  type TransportMode,
} from "@/lib/event-form";

interface FormConfig {
  id: string;
  welcome_message: string | null;
  brand_color: string | null;
}

interface EventInfo {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
}

interface OrgInfo {
  id: string;
  legal_name: string;
  logo_url: string | null;
}

const TRANSPORT_OPTIONS: { value: TransportMode; labelKey: string }[] = [
  { value: "flight_economy", labelKey: "publicForm.transport.flightEconomy" },
  { value: "flight_business", labelKey: "publicForm.transport.flightBusiness" },
  { value: "car_petrol", labelKey: "publicForm.transport.carPetrol" },
  { value: "car_ev", labelKey: "publicForm.transport.carEv" },
  { value: "bus", labelKey: "publicForm.transport.bus" },
  { value: "train", labelKey: "publicForm.transport.train" },
  { value: "motorbike", labelKey: "publicForm.transport.motorbike" },
  { value: "walk_bike", labelKey: "publicForm.transport.walkBike" },
];

const DIET_OPTIONS: { value: Diet; labelKey: string }[] = [
  { value: "standard", labelKey: "publicForm.diet.standard" },
  { value: "vegetarian", labelKey: "publicForm.diet.vegetarian" },
  { value: "vegan", labelKey: "publicForm.diet.vegan" },
  { value: "none", labelKey: "publicForm.diet.none" },
];

interface Props {
  token: string;
  form: FormConfig;
  event: EventInfo;
  organization: OrgInfo;
}

export function PublicFormView({ token, form, event, organization }: Props) {
  const { t } = useTranslation();
  const accent = form.brand_color ?? "#1F8505";

  const [submission, setSubmission] = useState<PublicFormSubmission>({
    transport_mode: "flight_economy",
    distance_km: 0,
    round_trip: true,
    diet: "standard",
    meals_count: 1,
    hotel_nights: 0,
  });
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [success, setSuccess] = useState<{ co2e: number } | null>(null);

  const livePreview = estimateCo2eKg(submission);

  const update = <K extends keyof PublicFormSubmission>(
    key: K,
    value: PublicFormSubmission[K]
  ) => setSubmission((s) => ({ ...s, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRetryAfter(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/public/event-form/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...submission,
          attendee_email: email || undefined,
          website,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json?.error as string) ?? "INTERNAL_ERROR");
        if (json?.retryAfterSec) setRetryAfter(Number(json.retryAfterSec));
        return;
      }
      setSuccess({ co2e: Number(json?.computed_co2e ?? livePreview) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "INTERNAL_ERROR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5FAF3] flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="text-xs uppercase tracking-wide text-[#6E726E]">
            {organization.legal_name}
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold mt-1"
            style={{ color: accent }}
          >
            {event.name}
          </h1>
          {event.start_date && event.end_date && (
            <p className="text-sm text-[#6E726E] mt-1">
              {event.start_date} → {event.end_date}
            </p>
          )}
          {form.welcome_message && (
            <p className="text-[#3B3D3B] mt-4 text-sm leading-6 whitespace-pre-wrap">
              {form.welcome_message}
            </p>
          )}
        </header>

        {success ? (
          <SuccessCard co2e={success.co2e} />
        ) : (
          <form
            onSubmit={submit}
            className="bg-white border border-[#DAEDD5] rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm"
          >
            <h2 className="text-[#155A03] text-lg font-semibold">
              {t("publicForm.heading")}
            </h2>

            <Field label={t("publicForm.field.email")}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
                placeholder="optional@example.com"
                maxLength={320}
              />
            </Field>

            <Field label={t("publicForm.field.transport")}>
              <select
                value={submission.transport_mode}
                onChange={(e) =>
                  update("transport_mode", e.target.value as TransportMode)
                }
                className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
                required
              >
                {TRANSPORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(o.labelKey)}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("publicForm.field.distance")}>
                <input
                  type="number"
                  min={0}
                  max={50000}
                  step="any"
                  value={submission.distance_km}
                  onChange={(e) =>
                    update("distance_km", Number(e.target.value))
                  }
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
                />
              </Field>
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={submission.round_trip}
                  onChange={(e) => update("round_trip", e.target.checked)}
                />
                <span>{t("publicForm.field.roundTrip")}</span>
              </label>
            </div>

            <Field label={t("publicForm.field.diet")}>
              <select
                value={submission.diet}
                onChange={(e) => update("diet", e.target.value as Diet)}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
                required
              >
                {DIET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(o.labelKey)}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("publicForm.field.meals")}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={submission.meals_count}
                  onChange={(e) =>
                    update("meals_count", Number(e.target.value))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
                />
              </Field>
              <Field label={t("publicForm.field.hotelNights")}>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={submission.hotel_nights ?? 0}
                  onChange={(e) =>
                    update("hotel_nights", Number(e.target.value))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
                />
              </Field>
            </div>

            {/* Honeypot — positioned off-screen instead of `display:none` so
              * modern form-fillers and headless browsers still see + auto-fill
              * it. `aria-hidden` + `tabIndex={-1}` + `autoComplete="off"` keep
              * it invisible to real users and screen readers. */}
            <div
              style={{
                position: "absolute",
                left: "-9999px",
                top: "auto",
                width: 1,
                height: 1,
                overflow: "hidden",
              }}
              aria-hidden="true"
            >
              <label>
                Website URL
                <input
                  type="text"
                  name="website_url_check"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </div>

            {/* Live preview */}
            <div className="bg-[#F0FDF4] border border-[#DAEDD5] rounded-lg p-4 flex items-center justify-between">
              <span className="text-sm text-[#6E726E]">
                {t("publicForm.livePreview")}
              </span>
              <span className="text-2xl font-bold" style={{ color: accent }}>
                {livePreview.toFixed(2)} kg CO₂e
              </span>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {t(`publicForm.error.${error}`, {
                  defaultValue: t(`error.${error}`, { defaultValue: error }),
                })}
                {retryAfter ? ` (${retryAfter}s)` : ""}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: accent }}
              className="w-full px-5 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
            >
              {loading ? t("publicForm.sending") : t("publicForm.submit")}
            </button>

            <p className="text-[10px] text-[#AAAAAA] text-center pt-2">
              {t("publicForm.privacyNote")}
            </p>
          </form>
        )}
      </div>
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

function SuccessCard({ co2e }: { co2e: number }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white border border-[#DAEDD5] rounded-2xl p-8 text-center shadow-sm">
      <div className="w-14 h-14 mx-auto rounded-full bg-[#F0FDF4] flex items-center justify-center text-3xl">
        ✓
      </div>
      <h2 className="text-[#155A03] text-2xl font-bold mt-4">
        {t("publicForm.successTitle")}
      </h2>
      <p className="text-[#3B3D3B] mt-2">{t("publicForm.successBody")}</p>
      <div className="mt-4 text-3xl font-bold text-[#1F8505]">
        {co2e.toFixed(2)} kg CO₂e
      </div>
      <p className="text-xs text-[#AAAAAA] mt-2">
        {t("publicForm.successFootnote")}
      </p>
    </div>
  );
}
