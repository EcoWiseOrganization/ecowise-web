"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LogoutIcon from "@mui/icons-material/Logout";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { signOut } from "@/services/auth.actions";
import { WORKSPACE } from "../_data/mock";
import type { SvgIconComponent } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

export interface MenuItem {
  label: string;
  href: string;
  icon: SvgIconComponent;
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface SidebarProps {
  userName: string;
  userRole: string;
  menuSections: MenuSection[];
  showWorkspace?: boolean;
}

function checkActive(pathname: string, href: string): boolean {
  if (href === "/dashboard" || href === "/admin") return pathname === href;
  return pathname.startsWith(href);
}

function SidebarContent({
  userName,
  userRole,
  menuSections,
  showWorkspace,
  pathname,
  onClose,
}: SidebarProps & { pathname: string; onClose?: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-[19px] pt-5 flex items-center justify-between">
        <Link href="/" onClick={onClose}>
          <Image src="/img/logo.png" alt="EcoWise" width={134} height={30} />
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-[#79B669] bg-transparent border-none cursor-pointer"
            aria-label="Close sidebar"
          >
            <CloseIcon sx={{ fontSize: 22 }} />
          </button>
        )}
      </div>

      {/* User Profile */}
      <div className="px-[19px] pt-5 flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-full bg-[#D9D9D9] overflow-hidden flex-shrink-0" />
        <div className="flex flex-col gap-1">
          <span className="text-[#155A03] text-sm font-semibold leading-none truncate max-w-[120px]">
            {userName}
          </span>
          <span className="text-[#AAAAAA] text-xs leading-4 truncate max-w-[120px]">
            {userRole}
          </span>
        </div>
      </div>

      {/* Workspace */}
      {showWorkspace && (
        <div className="px-[19px] pt-6 flex flex-col gap-3">
          <h3 className="text-[#155A03] text-xs font-bold uppercase tracking-[0.5px] leading-[15px]">
            {t("sidebar.workspace")}
          </h3>
          <div className="p-2.5 border border-[#DAEDD5] rounded-lg shadow-[0px_4px_4px_rgba(218,237,213,0.25)] flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[#155A03] text-xs font-bold leading-5">
                {WORKSPACE.name}
              </span>
              <span className="text-[#AAAAAA] text-xs leading-[15px]">
                {WORKSPACE.location}
              </span>
            </div>
            <KeyboardArrowDownIcon sx={{ fontSize: 17, color: "#79B669" }} />
          </div>
        </div>
      )}

      {/* Dynamic Menu Sections */}
      {menuSections.map((section) => (
        <div key={section.title} className="px-[19px] pt-6 flex flex-col gap-3">
          <h3 className="text-[#155A03] text-xs font-bold uppercase tracking-[0.5px] leading-[15px]">
            {t(section.title, { defaultValue: section.title })}
          </h3>
          <nav className="flex flex-col gap-0.5">
            {section.items.map(({ label, href, icon: Icon }) => {
              const active = checkActive(pathname, href);
              return (
                <Link
                  key={label}
                  href={href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline transition-colors ${
                    active
                      ? "bg-[#DAEDD5] text-[#1F8505] font-bold"
                      : "text-[#79B669] hover:bg-[#DAEDD5]/50"
                  }`}
                >
                  <Icon sx={{ fontSize: 18, color: active ? "#1F8505" : "#79B669" }} />
                  <span className="text-sm leading-6">
                    {t(label, { defaultValue: label })}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      ))}

      {/* Language Switcher + Log Out */}
      <div className="px-[19px] pt-4 mt-auto pb-6 flex flex-col gap-2">
        <div className="px-3 py-2">
          <LanguageSwitcher />
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors bg-transparent border-none cursor-pointer"
          >
            <LogoutIcon sx={{ fontSize: 20, color: "#EF4444" }} />
            <span className="text-sm leading-6">{t("sidebar.logout")}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export function Sidebar({ userName, userRole, menuSections, showWorkspace = true }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button — fixed, top-left, visible on < lg */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-white rounded-lg border border-[#DAEDD5] shadow-md text-[#79B669] cursor-pointer"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
      >
        <MenuIcon sx={{ fontSize: 22 }} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 w-[222px] h-screen bg-white border-r border-[#DAEDD5] shadow-[2px_0px_4px_rgba(218,237,213,0.25)] flex flex-col transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <SidebarContent
          userName={userName}
          userRole={userRole}
          menuSections={menuSections}
          showWorkspace={showWorkspace}
          pathname={pathname}
          onClose={() => setMobileOpen(false)}
        />
      </aside>
    </>
  );
}
