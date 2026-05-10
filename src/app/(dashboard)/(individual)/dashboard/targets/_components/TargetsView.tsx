"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import {
  archiveTargetAction,
  createMyTargetAction,
  getActiveTargetAction,
  listMyTargetsAction,
} from "@/app/actions/personal-carbon.actions";
import type {
  CarbonTarget,
  CarbonTargetWithProgress,
} from "@/types/target.types";

export function TargetsView() {
  const { t } = useTranslation();
  const [active, setActive] = useState<CarbonTargetWithProgress | null>(null);
  const [history, setHistory] = useState<CarbonTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    let cancelled = false;
    (async () => {
      const [a, h] = await Promise.all([
        getActiveTargetAction(),
        listMyTargetsAction(),
      ]);
      if (cancelled) return;
      setActive(a.data);
      setHistory(h.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    return load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#DAEDD5] p-12 text-center text-sm text-[#6E726E]">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {t(`error.${error}`, { defaultValue: error })}
        </div>
      )}

      {active ? (
        <ActiveTargetCard
          target={active}
          onArchive={(id) => {
            startTransition(async () => {
              const res = await archiveTargetAction(id);
              if (!res.ok) setError(res.error ?? "unknown");
              else load();
            });
          }}
          archiving={pending}
        />
      ) : (
        <div className="bg-white border border-[#DAEDD5] rounded-2xl p-6 text-center">
          <p className="text-[#6E726E] text-sm">{t("targets.noActive")}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-[#155A03] text-base font-semibold">
          {t("targets.history")}
        </h3>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="px-4 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold"
        >
          {showForm ? t("common.cancel") : t("targets.create")}
        </button>
      </div>

      {showForm && (
        <NewTargetForm
          onCreated={() => {
            setShowForm(false);
            load();
          }}
          onError={(c) => setError(c)}
        />
      )}

      {history.length === 0 ? (
        <p className="text-sm text-[#AAAAAA]">{t("targets.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {history.map((tg) => (
            <li
              key={tg.id}
              className="bg-white border border-[#DAEDD5] rounded-xl px-4 py-3 flex justify-between items-center text-sm"
            >
              <div>
                <div className="font-medium text-[#141514]">{tg.name}</div>
                <div className="text-xs text-[#AAAAAA]">
                  {tg.start_date} → {tg.end_date} ·{" "}
                  {Number(tg.baseline_co2e).toFixed(0)} kg →{" "}
                  {Number(tg.target_co2e).toFixed(0)} kg
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  tg.status === "Active"
                    ? "bg-[#f0f9ed] text-[#1F8505]"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {tg.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActiveTargetCard({
  target,
  onArchive,
  archiving,
}: {
  target: CarbonTargetWithProgress;
  onArchive: (id: string) => void;
  archiving: boolean;
}) {
  const { t } = useTranslation();
  const pct = Math.max(0, Math.min(100, Math.round(target.progress_pct * 100)));
  const elapsedPct =
    target.total_days > 0
      ? Math.round((target.elapsed_days / target.total_days) * 100)
      : 0;
  return (
    <div className="bg-white border border-[#B8D6B0] rounded-2xl p-6 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-[#155A03] text-lg font-semibold">{target.name}</h3>
          <p className="text-sm text-[#6E726E]">
            {target.start_date} → {target.end_date}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onArchive(target.id)}
          disabled={archiving}
          className="text-xs text-red-600 hover:underline disabled:opacity-50"
        >
          {t("targets.archive")}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <Stat label={t("targets.baseline")} value={`${target.baseline_co2e.toFixed(0)} kg`} />
        <Stat label={t("targets.current")} value={`${target.current_co2e.toFixed(0)} kg`} />
        <Stat label={t("targets.target")} value={`${target.target_co2e.toFixed(0)} kg`} />
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span>{t("targets.progress")}</span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${target.on_track ? "bg-[#1F8505]" : "bg-red-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1 text-[#AAAAAA]">
          <span>{t("targets.timeElapsed")}</span>
          <span>
            {target.elapsed_days} / {target.total_days} {t("targets.days")}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#79B669]"
            style={{ width: `${elapsedPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F0FDF4] rounded-lg p-3">
      <div className="text-[10px] uppercase text-[#6E726E]">{label}</div>
      <div className="text-[#155A03] font-bold">{value}</div>
    </div>
  );
}

function NewTargetForm({
  onCreated,
  onError,
}: {
  onCreated: () => void;
  onError: (code: string) => void;
}) {
  const { t } = useTranslation();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [baseline, setBaseline] = useState("");
  const [target, setTarget] = useState("");
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState(() =>
    new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10)
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createMyTargetAction({
        name,
        baseline_co2e: parseFloat(baseline),
        target_co2e: parseFloat(target),
        start_date: start,
        end_date: end,
      });
      if (res.error) {
        onError(res.error);
        return;
      }
      onCreated();
    });
  };

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-[#DAEDD5] rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <Field label={t("targets.field.name")}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
        />
      </Field>
      <Field label={t("targets.field.baseline")}>
        <input
          type="number"
          value={baseline}
          onChange={(e) => setBaseline(e.target.value)}
          required
          min={0}
          step="any"
          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
        />
      </Field>
      <Field label={t("targets.field.target")}>
        <input
          type="number"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          required
          min={0}
          step="any"
          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
        />
      </Field>
      <div />
      <Field label={t("targets.field.start")}>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
        />
      </Field>
      <Field label={t("targets.field.end")}>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
        />
      </Field>
      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 rounded-lg bg-[#155A03] text-white text-sm font-semibold disabled:opacity-50"
        >
          {pending ? t("common.creating") : t("targets.save")}
        </button>
      </div>
    </form>
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
