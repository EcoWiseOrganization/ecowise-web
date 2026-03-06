"use client";

import Link from "next/link";
import Image from "next/image";
import LanguageIcon from "@mui/icons-material/Language";
import PersonIcon from "@mui/icons-material/Person";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/app/(auth)/login/actions";
import { useState, useRef, useEffect } from "react";

const NAV_LINKS = [
  { label: "About Us", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Products", href: "#products" },
  { label: "Contact", href: "#contact" },
];

function GuestActions() {
  return (
    <div className="flex items-center gap-5">
      <Link
        href="/login"
        className="px-5 py-2.5 rounded-xl border border-[#1F8505] text-[#1F8505] text-base font-medium no-underline hover:bg-[#1F8505] hover:text-white hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
      >
        Sign in
      </Link>
      <Link
        href="/register"
        className="px-5 py-2.5 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-base font-medium no-underline hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
      >
        Sign up
      </Link>
    </div>
  );
}

function UserActions({ displayName }: { displayName: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-5">
      {/* Notification bell */}
      <button className="w-6 h-6 text-[#79B669] cursor-pointer bg-transparent border-none p-0">
        <NotificationsNoneIcon sx={{ fontSize: 24 }} />
      </button>

      {/* User badge with dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-2.5 py-2.5 bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] rounded-xl cursor-pointer border-none hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
        >
          <PersonIcon sx={{ fontSize: 24, color: "white" }} />
          <span className="text-white text-xl font-medium">{displayName}</span>
        </button>

        {/* Dropdown menu */}
        {open && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[#DAEDD5] py-2 z-50">
            <Link
              href="/dashboard"
              className="block px-4 py-2.5 text-sm text-[#155A03] no-underline hover:bg-[#f0f9ed] transition-colors"
            >
              Dashboard
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 bg-transparent border-none cursor-pointer hover:bg-red-50 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export function Header() {
  const { user, loading } = useAuth();

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  return (
    <header className="fixed top-0 left-0 z-50 w-full bg-white/85 backdrop-blur-sm shadow-[0px_2px_4px_rgba(218,237,213,0.25)] border-b border-[#DAEDD5] px-[120px] py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[131px]">
          <Link href="/">
            <Image
              src="/img/logo.png"
              alt="EcoWise Logo"
              width={174}
              height={39}
              priority
            />
          </Link>
          <nav className="flex items-center gap-2.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="p-2.5 text-[#79B669] text-base font-medium no-underline hover:text-[#1F8505] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-[60px]">
          {/* Auth section - skeleton while loading to prevent flash */}
          {loading ? (
            <div className="w-[180px] h-10" />
          ) : user ? (
            <UserActions displayName={displayName} />
          ) : (
            <GuestActions />
          )}

          <div className="flex items-center gap-1.5 text-[#79B669]">
            <LanguageIcon sx={{ fontSize: 24 }} />
            <span className="text-base font-medium">EN</span>
          </div>
        </div>
      </div>
    </header>
  );
}
