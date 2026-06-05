"use client";

import { useTranslation } from "react-i18next";
import { useContactForm } from "@/hooks/useContactForm";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import FacebookIcon from "@mui/icons-material/Facebook";
import LocationOnIcon from "@mui/icons-material/LocationOn";

export function ContactBody() {
  const { t } = useTranslation();
  const { form, update, loading, error, retryAfter, success, submit } = useContactForm();

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-16">
      <header className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-[#155A03] text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
          {t("contact.title")}
        </h1>
        <p className="text-[#6E726E] text-base sm:text-lg mt-4 leading-7">
          {t("contact.subtitle")}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info */}
        <aside className="bg-[#F0FDF4] border border-[#DAEDD5] rounded-2xl p-8 flex flex-col gap-6">
          <h2 className="text-[#155A03] text-xl font-semibold">
            {t("contact.info.title")}
          </h2>
          <Row
            icon={EmailIcon}
            label="Email"
            value="ecowise.official.vn@gmail.com"
            href="mailto:ecowise.official.vn@gmail.com"
          />
          <Row
            icon={PhoneIcon}
            label={t("contact.info.phone")}
            value="036 611 2016"
            href="tel:+84366112016"
          />
          <Row
            icon={FacebookIcon}
            label="Facebook"
            value="EcoWise.Netzero"
            href="https://www.facebook.com/EcoWise.Netzero"
            external
          />
          <Row icon={LocationOnIcon} label={t("contact.info.address")} value={t("contact.info.addressValue")} />
        </aside>

        {/* Form */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await submit();
          }}
          className="lg:col-span-2 bg-white border border-[#DAEDD5] rounded-2xl p-8 flex flex-col gap-4"
        >
          <h2 className="text-[#155A03] text-xl font-semibold">
            {t("contact.form.title")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label={t("contact.form.name")}
              value={form.name}
              onChange={(v) => update("name", v)}
              required
            />
            <Field
              label={t("contact.form.email")}
              type="email"
              value={form.email}
              onChange={(v) => update("email", v)}
              required
            />
          </div>
          <Field
            label={t("contact.form.subject")}
            value={form.subject}
            onChange={(v) => update("subject", v)}
          />
          <label className="block">
            <span className="block text-xs font-medium text-[#6E726E] mb-1">
              {t("contact.form.message")} *
            </span>
            <textarea
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              rows={6}
              required
              maxLength={5000}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm resize-none"
            />
          </label>

          {/* Honeypot — hidden from users */}
          <label className="hidden" aria-hidden="true">
            Website
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
            />
          </label>

          {error && (
            <p className="text-sm text-red-700">
              {t(`contact.error.${error}`, {
                defaultValue: t(`error.${error}`, { defaultValue: error }),
              })}
              {retryAfter ? ` (${retryAfter}s)` : ""}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-700">{t("contact.success")}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="self-start px-6 py-3 bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white rounded-xl text-sm font-semibold hover:shadow-lg disabled:opacity-50 transition"
          >
            {loading ? t("contact.form.sending") : t("contact.form.send")}
          </button>
        </form>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  href,
  external,
}: {
  icon: typeof PhoneIcon;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  const valueClass = "text-sm text-[#155A03] font-medium break-all";
  return (
    <div className="flex items-start gap-3">
      <span className="text-[#1F8505] mt-0.5">
        <Icon sx={{ fontSize: 20 }} />
      </span>
      <div>
        <div className="text-xs text-[#6E726E]">{label}</div>
        {href ? (
          <a
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className={`${valueClass} no-underline hover:text-[#1F8505] transition-colors`}
          >
            {value}
          </a>
        ) : (
          <div className={valueClass}>{value}</div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[#6E726E] mb-1">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
        maxLength={320}
      />
    </label>
  );
}
