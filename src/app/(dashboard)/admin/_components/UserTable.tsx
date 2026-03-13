"use client";

import { useTranslation } from "react-i18next";
import type { User } from "@/types/user.types";

interface UserTableProps {
  users: User[];
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        isActive
          ? "bg-[#DAEDD5] text-[#155A03]"
          : "bg-red-50 text-red-600"
      }`}
    >
      {status}
    </span>
  );
}

function RoleBadge({ isAdmin }: { isAdmin: boolean }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        isAdmin
          ? "bg-[#FFF3CD] text-[#856404]"
          : "bg-[#E8F4FD] text-[#0C5460]"
      }`}
    >
      {isAdmin ? "Admin" : "User"}
    </span>
  );
}

export function UserTable({ users }: UserTableProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-3xl border border-[#B8D6B0] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#DAEDD5]">
            <th className="text-left px-6 py-4 text-[#155A03] text-sm font-bold">
              {t("admin.users.table.user")}
            </th>
            <th className="text-left px-6 py-4 text-[#155A03] text-sm font-bold">
              {t("admin.users.table.email")}
            </th>
            <th className="text-left px-6 py-4 text-[#155A03] text-sm font-bold">
              {t("admin.users.table.role")}
            </th>
            <th className="text-left px-6 py-4 text-[#155A03] text-sm font-bold">
              {t("admin.users.table.status")}
            </th>
            <th className="text-left px-6 py-4 text-[#155A03] text-sm font-bold">
              {t("admin.users.table.greenPoints")}
            </th>
            <th className="text-left px-6 py-4 text-[#155A03] text-sm font-bold">
              {t("admin.users.table.joined")}
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-[#DAEDD5] last:border-b-0 hover:bg-[#F9FDF7] transition-colors"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#D9D9D9] flex-shrink-0" />
                  <span className="text-[#155A03] text-sm font-medium">
                    {user.full_name || user.user_name || "N/A"}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 text-[#6E726E] text-sm">
                {user.email}
              </td>
              <td className="px-6 py-4">
                <RoleBadge isAdmin={user.is_admin} />
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={user.status} />
              </td>
              <td className="px-6 py-4 text-[#155A03] text-sm font-medium">
                {user.green_points}
              </td>
              <td className="px-6 py-4 text-[#6E726E] text-sm">
                {new Date(user.created_at).toLocaleDateString("vi-VN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {users.length === 0 && (
        <div className="p-12 flex items-center justify-center">
          <p className="text-[#6E726E] text-sm">{t("admin.users.empty")}</p>
        </div>
      )}
    </div>
  );
}
