"use client";

import { useState, useTransition, useCallback } from "react";
import {
  setMemberStatusAction,
  updateMemberRoleAction,
  removeMemberAction,
} from "@/app/actions/org-admin.actions";
import { ROLE_ADMIN_ID, ROLE_MEMBER_ID } from "@/lib/roles";
import type {
  EmployeeActivityRow,
  MemberRole,
  MemberStatus,
} from "@/types/organization.types";

interface MembershipRow {
  member_id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  role_id: string;
  status: MemberStatus;
  total_logs: number;
  total_co2e_kg: number;
  last_activity_at: string | null;
}

export function useEmployeeManager(orgId: string, initial: MembershipRow[]) {
  const [rows, setRows] = useState<MembershipRow[]>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback((next: MembershipRow[]) => setRows(next), []);

  const changeRole = useCallback(
    (memberId: string, newRole: MemberRole) => {
      setError(null);
      startTransition(async () => {
        const res = await updateMemberRoleAction(orgId, memberId, newRole);
        if (!res.ok) {
          setError(res.error ?? "unknown");
          return;
        }
        setRows((prev) =>
          prev.map((r) =>
            r.member_id === memberId
              ? {
                  ...r,
                  role_id:
                    newRole === "Organization Admin"
                      ? ROLE_ADMIN_ID
                      : ROLE_MEMBER_ID,
                }
              : r
          )
        );
      });
    },
    [orgId]
  );

  const changeStatus = useCallback(
    (memberId: string, status: MemberStatus) => {
      setError(null);
      startTransition(async () => {
        const res = await setMemberStatusAction(orgId, memberId, status);
        if (!res.ok) {
          setError(res.error ?? "unknown");
          return;
        }
        setRows((prev) =>
          prev.map((r) => (r.member_id === memberId ? { ...r, status } : r))
        );
      });
    },
    [orgId]
  );

  const remove = useCallback(
    (memberId: string) => {
      setError(null);
      startTransition(async () => {
        const res = await removeMemberAction(orgId, memberId);
        if (!res.ok) {
          setError(res.error ?? "unknown");
          return;
        }
        setRows((prev) => prev.filter((r) => r.member_id !== memberId));
      });
    },
    [orgId]
  );

  return { rows, pending, error, refresh, changeRole, changeStatus, remove };
}

export type { MembershipRow };
export type { EmployeeActivityRow };
