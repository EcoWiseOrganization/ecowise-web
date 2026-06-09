"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminUserListRow } from "@/services/user.service";

interface UserTableProps {
  users: AdminUserListRow[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
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

export function UserTable({ users, total, page, pageSize, search }: UserTableProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const [searchValue, setSearchValue] = useState(search);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(nextPage: number, nextSearch: string) {
    const sp = new URLSearchParams(params?.toString() ?? "");
    if (nextSearch.trim()) sp.set("q", nextSearch.trim());
    else sp.delete("q");
    if (nextPage > 1) sp.set("page", String(nextPage));
    else sp.delete("page");
    router.push(`/admin/users${sp.size ? `?${sp}` : ""}`);
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(1, searchValue);
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={onSearchSubmit} className="flex items-center gap-2">
        <input
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={t("admin.users.searchPlaceholder", {
            defaultValue: "Search by email or name…",
          })}
          className="flex-1 max-w-md px-3 py-2 rounded-xl border border-[#DAEDD5] text-sm text-[#3B3D3B] focus:outline-none focus:ring-2 focus:ring-[#79B669]"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-[#1F8505] text-white text-sm font-medium hover:bg-[#176d04]"
        >
          {t("common.search", { defaultValue: "Search" })}
        </button>
        {search ? (
          <button
            type="button"
            onClick={() => {
              setSearchValue("");
              navigate(1, "");
            }}
            className="px-3 py-2 rounded-xl border border-[#DAEDD5] text-[#3B3D3B] text-sm hover:bg-[#f5f5f5]"
          >
            {t("common.clear", { defaultValue: "Clear" })}
          </button>
        ) : null}
      </form>

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

      <div className="flex items-center justify-between text-sm text-[#6E726E]">
        <span>
          {t("admin.users.pagination.summary", {
            defaultValue: "{{from}}–{{to}} of {{total}}",
            from: total === 0 ? 0 : (page - 1) * pageSize + 1,
            to: Math.min(page * pageSize, total),
            total,
          })}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => navigate(page - 1, search)}
            className="px-3 py-1.5 rounded-lg border border-[#DAEDD5] text-[#3B3D3B] text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f5f5f5]"
          >
            {t("common.previous", { defaultValue: "Previous" })}
          </button>
          <span className="text-xs">
            {t("admin.users.pagination.page", {
              defaultValue: "Page {{page}} / {{total}}",
              page,
              total: totalPages,
            })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => navigate(page + 1, search)}
            className="px-3 py-1.5 rounded-lg border border-[#DAEDD5] text-[#3B3D3B] text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f5f5f5]"
          >
            {t("common.next", { defaultValue: "Next" })}
          </button>
        </div>
      </div>
    </div>
  );
}
