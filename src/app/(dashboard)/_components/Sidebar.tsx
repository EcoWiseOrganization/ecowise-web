"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutIcon from "@mui/icons-material/Logout";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { signOut } from "@/services/auth.actions";
import { WORKSPACE } from "../_data/mock";
import type { SvgIconComponent } from "@mui/icons-material";

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

export function Sidebar({ userName, userRole, menuSections, showWorkspace = true }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 z-40 w-[222px] h-screen bg-white border-r border-[#DAEDD5] shadow-[2px_0px_4px_rgba(218,237,213,0.25)] flex flex-col">
      {/* Logo */}
      <div className="px-[19px] pt-5">
        <Link href="/">
          <Image src="/img/logo.png" alt="EcoWise" width={134} height={30} />
        </Link>
      </div>

      {/* User Profile */}
      <div className="px-[19px] pt-5 flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-full bg-[#D9D9D9] overflow-hidden flex-shrink-0" />
        <div className="flex flex-col gap-1">
          <span className="text-[#155A03] text-sm font-semibold leading-none truncate max-w-[108px]">
            {userName}
          </span>
          <span className="text-[#AAAAAA] text-xs leading-4 truncate max-w-[108px]">
            {userRole}
          </span>
        </div>
      </div>

      {/* Workspace */}
      {showWorkspace && (
        <div className="px-[19px] pt-6 flex flex-col gap-3">
          <h3 className="text-[#155A03] text-xs font-bold uppercase tracking-[0.5px] leading-[15px]">
            Workspace
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
            {section.title}
          </h3>
          <nav className="flex flex-col gap-0.5">
            {section.items.map(({ label, href, icon: Icon }) => {
              const active = checkActive(pathname, href);
              return (
                <Link
                  key={label}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline transition-colors ${
                    active
                      ? "bg-[#DAEDD5] text-[#1F8505] font-bold"
                      : "text-[#79B669] hover:bg-[#DAEDD5]/50"
                  }`}
                >
                  <Icon sx={{ fontSize: 18, color: active ? "#1F8505" : "#79B669" }} />
                  <span className="text-sm leading-6">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ))}

      {/* Log Out */}
      <div className="px-[19px] pt-4 mt-auto pb-6">
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors bg-transparent border-none cursor-pointer"
          >
            <LogoutIcon sx={{ fontSize: 20, color: "#EF4444" }} />
            <span className="text-sm leading-6">Log Out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
