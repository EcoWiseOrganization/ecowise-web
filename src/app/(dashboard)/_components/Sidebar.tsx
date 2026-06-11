"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LogoutIcon from "@mui/icons-material/Logout";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { signOut } from "@/services/auth.actions";
import type { SvgIconComponent } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { useWorkspace } from "../_context/WorkspaceContext";

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
  const { organizations, selectedOrgId, setSelectedOrgId, selectedOrg } = useWorkspace();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Collapsed-by-user state per menu section, persisted to localStorage so
  // toggles survive navigations. We only store closed sections; missing
  // keys default to open. The render logic also force-opens any section
  // containing the active route so the current page is never hidden.
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(
    {},
  );
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("ecowise.sidebar.collapsed");
      // Hydration step: localStorage isn't available during SSR, so we must
      // sync it in an effect — `react-hooks/set-state-in-effect` flags this
      // but the alternative (useSyncExternalStore) is overkill for a UI
      // preference. Disable for this one call.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setCollapsedSections(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      // Ignore — corrupted JSON or storage disabled, just stay default-open.
    }
  }, []);
  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      if (!next[title]) delete next[title];
      try {
        window.localStorage.setItem(
          "ecowise.sidebar.collapsed",
          JSON.stringify(next),
        );
      } catch {
        // Storage might be disabled (Safari private mode); state still
        // applies for this session.
      }
      return next;
    });
  };

  useEffect(() => {
    if (!workspaceOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
        setWorkspaceOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [workspaceOpen]);

  const displayName = selectedOrg?.legal_name ?? t("sidebar.individual", { defaultValue: "Individual" });
  const displaySub = selectedOrg
    ? selectedOrg.address || selectedOrg.org_type || ""
    : t("sidebar.personal", { defaultValue: "Personal" });

  // `overflow-y-auto` + `overscroll-contain` so the sidebar scrolls internally
  // when the menu doesn't fit (short viewports, many tabs, zoomed-in users).
  // Without this `mt-auto` pushes the language picker + logout below the
  // viewport and they become unreachable.
  return (
    <div className="flex flex-col h-full overflow-y-auto overscroll-contain">
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
            {t(`sidebar.role.${userRole.toLowerCase()}`, { defaultValue: userRole })}
          </span>
        </div>
      </div>

      {/* Workspace */}
      {showWorkspace && (
        <div className="px-[19px] pt-6 flex flex-col gap-3">
          <h3 className="text-[#155A03] text-xs font-bold uppercase tracking-[0.5px] leading-[15px]">
            {t("sidebar.workspace")}
          </h3>
          <div ref={workspaceRef} className="relative">
            <button
              onClick={() => setWorkspaceOpen((prev) => !prev)}
              className="w-full p-2.5 border border-[#DAEDD5] rounded-lg shadow-[0px_4px_4px_rgba(218,237,213,0.25)] flex items-center justify-between bg-white cursor-pointer"
            >
              <div className="flex flex-col gap-1 text-left">
                <span className="text-[#155A03] text-xs font-bold leading-5 truncate max-w-[130px]">
                  {displayName}
                </span>
                <span className="text-[#AAAAAA] text-xs leading-[15px] truncate max-w-[130px]">
                  {displaySub}
                </span>
              </div>
              <KeyboardArrowDownIcon
                sx={{
                  fontSize: 17,
                  color: "#79B669",
                  transition: "transform 0.2s",
                  transform: workspaceOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            {workspaceOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DAEDD5] rounded-lg shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
                {/* Individual option */}
                <button
                  onClick={() => {
                    setSelectedOrgId(null);
                    setWorkspaceOpen(false);
                  }}
                  className={`w-full p-2.5 text-left flex flex-col gap-0.5 transition-colors cursor-pointer border-none ${
                    selectedOrgId === null
                      ? "bg-[#DAEDD5]"
                      : "hover:bg-[#DAEDD5]/50"
                  }`}
                >
                  <span className="text-[#155A03] text-xs font-bold leading-5">
                    {t("sidebar.individual", { defaultValue: "Individual" })}
                  </span>
                  <span className="text-[#AAAAAA] text-xs leading-[15px]">
                    {t("sidebar.personal", { defaultValue: "Personal" })}
                  </span>
                </button>

                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      setSelectedOrgId(org.id);
                      setWorkspaceOpen(false);
                    }}
                    className={`w-full p-2.5 text-left flex flex-col gap-0.5 transition-colors cursor-pointer border-none border-t border-[#DAEDD5]/60 ${
                      selectedOrgId === org.id
                        ? "bg-[#DAEDD5]"
                        : "hover:bg-[#DAEDD5]/50"
                    }`}
                  >
                    <span className="text-[#155A03] text-xs font-bold leading-5 truncate max-w-[160px]">
                      {org.legal_name}
                    </span>
                    <span className="text-[#AAAAAA] text-xs leading-[15px] truncate max-w-[160px]">
                      {org.address || org.org_type || ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Menu Sections — collapsible per section. Sections containing
       * the active route stay open by default so the user always sees where
       * they are. Toggling state lives in `collapsedSections` (closed only,
       * so a fresh load defaults everything to open). */}
      {menuSections.map((section) => {
        const hasActive = section.items.some((i) => checkActive(pathname, i.href));
        const isCollapsed = collapsedSections[section.title] ?? false;
        const open = !isCollapsed || hasActive;
        return (
          <div key={section.title} className="px-[19px] pt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => toggleSection(section.title)}
              aria-expanded={open}
              // `hover:bg-transparent active:bg-transparent` opts the header
              // out of the global `filter: brightness(...)` hover/active rule
              // in globals.css (the exclusion matches any class containing
              // `hover:bg-`). Without this the click feels like a brief
              // "loading" flash because the whole header dims for ~150ms.
              className="flex items-center justify-between gap-2 bg-transparent border-none p-0 text-left transition-none hover:bg-transparent active:bg-transparent"
            >
              <h3 className="text-[#155A03] text-xs font-bold uppercase tracking-[0.5px] leading-[15px]">
                {t(section.title, { defaultValue: section.title })}
              </h3>
              <KeyboardArrowDownIcon
                sx={{
                  fontSize: 16,
                  color: "#79B669",
                  transition: "transform 0.2s",
                  transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                }}
              />
            </button>
            {open && (
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
            )}
          </div>
        );
      })}

      {/* Language Switcher + Log Out */}
      <div className="px-[19px] pt-4 mt-auto pb-6 flex flex-col gap-2">
        <div className="px-3 py-2">
          <LanguageSwitcher direction="up" />
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
