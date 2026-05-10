"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { comparePeriodsAction } from "@/app/actions/personal-carbon.actions";

interface ComparisonResult {
  a: { total: number; logCount: number; start: string; end: string };
  b: { total: number; logCount: number; start: string; end: string };
  deltaKg: number;
  deltaPct: number;
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function CompareView() {
  const { t } = useTranslation();

  const [aStart, setAStart] = useState(() =>
    fmt(new Date(Date.now() - 60 * 86_400_000))
  );
  const [aEnd, setAEnd] = useState(() =>
    fmt(new Date(Date.now() - 30 * 86_400_000))
  );
  const [bStart, setBStart] = useState(() =>
    fmt(new Date(Date.now() - 30 * 86_400_000))
  );
  const [bEnd, setBEnd] = useState(() => fmt(new Date()));
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    if (new Date(aEnd) <= new Date(aStart) || new Date(bEnd) <= new Date(bStart)) {
      setError("MSG22");
      return;
    }
    startTransition(async () => {
      const res = await comparePeriodsAction({ aStart, aEnd, bStart, bEnd });
      if (res.error || !res.data) {
        setError(res.error ?? "unknown");
        setResult(null);
        return;
      }
      setResult(res.data);
    });
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-[#DAEDD5] rounded-2xl p-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <Field label={t("compare.field.aStart")}>
          <input
            type="date"
            value={aStart}
            onChange={(e) => setAStart(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("compare.field.aEnd")}>
          <input
            type="date"
            value={aEnd}
            onChange={(e) => setAEnd(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("compare.field.bStart")}>
          <input
            type="date"
            value={bStart}
            onChange={(e) => setBStart(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("compare.field.bEnd")}>
          <input
            type="date"
            value={bEnd}
            onChange={(e) => setBEnd(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-[#155A03] text-white text-sm font-semibold disabled:opacity-50"
        >
          {pending ? t("common.loading") : t("compare.run")}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {t(`error.${error}`, { defaultValue: error })}
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PeriodCard
            label="A"
            start={result.a.start}
            end={result.a.end}
            total={result.a.total}
            logCount={result.a.logCount}
          />
          <PeriodCard
            label="B"
            start={result.b.start}
            end={result.b.end}
            total={result.b.total}
            logCount={result.b.logCount}
          />
          <DeltaCard delta={result.deltaKg} pct={result.deltaPct} />
        </div>
      )}
    </div>
  );
}

function PeriodCard({
  label,
  start,
  end,
  total,
  logCount,
}: {
  label: string;
  start: string;
  end: string;
  total: number;
  logCount: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-white border border-[#DAEDD5] rounded-2xl p-6">
      <div className="text-xs uppercase text-[#6E726E]">
        {t("compare.period")} {label}
      </div>
      <div className="text-sm text-[#3B3D3B] mt-1">
        {start} → {end}
      </div>
      <div className="text-3xl font-bold text-[#155A03] mt-3">
        {total.toFixed(2)} kg
      </div>
      <div className="text-xs text-[#AAAAAA] mt-1">
        {logCount} {t("reports.logs")}
      </div>
    </div>
  );
}

function DeltaCard({ delta, pct }: { delta: number; pct: number }) {
  const { t } = useTranslation();
  const reduced = delta < 0;
  return (
    <div
      className={`bg-white border rounded-2xl p-6 ${
        reduced ? "border-[#1F8505]" : "border-orange-300"
      }`}
    >
      <div className="text-xs uppercase text-[#6E726E]">
        {t("compare.delta")}
      </div>
      <div
        className={`text-3xl font-bold mt-3 ${
          reduced ? "text-[#1F8505]" : "text-orange-700"
        }`}
      >
        {delta >= 0 ? "+" : ""}
        {delta.toFixed(2)} kg
      </div>
      <div className="text-sm mt-1">
        {pct >= 0 ? "+" : ""}
        {pct.toFixed(1)}% {reduced ? t("compare.reduced") : t("compare.increased")}
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
