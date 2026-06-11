"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createPersonalLogAction,
  deletePersonalLogAction,
  getDailyLogQuotaAction,
  getPersonalLogsAction,
  updatePersonalLogAction,
} from "@/app/actions/personal-carbon.actions";
import type {
  CreateEmissionLogInput,
  EmissionLogFilters,
  EmissionLogWithCategory,
} from "@/types/emission-log.types";

export function usePersonalActivity(initialFilters: EmissionLogFilters = {}) {
  const [logs, setLogs] = useState<EmissionLogWithCategory[]>([]);
  const [count, setCount] = useState(0);
  const [filters, setFilters] = useState<EmissionLogFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ used: number; limit: number }>({
    used: 0,
    limit: 50,
  });

  const refresh = useCallback(async (next: EmissionLogFilters = filters) => {
    const [list, q] = await Promise.all([
      getPersonalLogsAction(next),
      getDailyLogQuotaAction(),
    ]);
    if (list.error) setError(list.error);
    setLogs(list.data);
    setCount(list.count);
    setQuota({ used: q.used, limit: q.limit });
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [list, q] = await Promise.all([
        getPersonalLogsAction(initialFilters),
        getDailyLogQuotaAction(),
      ]);
      if (!active) return;
      if (list.error) setError(list.error);
      setLogs(list.data);
      setCount(list.count);
      setQuota({ used: q.used, limit: q.limit });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const create = useCallback(
    async (input: Omit<CreateEmissionLogInput, "org_id">) => {
      setSubmitting(true);
      setError(null);
      const res = await createPersonalLogAction(input);
      setSubmitting(false);
      if (!res.data) {
        setError(res.error ?? "unknown");
        return { ok: false, error: res.error ?? "unknown" };
      }
      await refresh();
      return { ok: true, error: null };
    },
    [refresh]
  );

  const update = useCallback(
    async (
      logId: string,
      patch: Partial<Omit<CreateEmissionLogInput, "org_id">>,
    ) => {
      setSubmitting(true);
      setError(null);
      const res = await updatePersonalLogAction(logId, patch);
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error ?? "unknown");
        return { ok: false, error: res.error ?? "unknown" };
      }
      await refresh();
      return { ok: true, error: null };
    },
    [refresh]
  );

  const remove = useCallback(
    async (logId: string) => {
      setError(null);
      const res = await deletePersonalLogAction(logId);
      if (!res.ok) {
        setError(res.error ?? "unknown");
        return false;
      }
      await refresh();
      return true;
    },
    [refresh]
  );

  return {
    logs,
    count,
    quota,
    loading,
    submitting,
    error,
    filters,
    setFilters,
    refresh,
    create,
    update,
    remove,
  };
}
