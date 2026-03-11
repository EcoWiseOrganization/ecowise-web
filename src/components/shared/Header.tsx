"use client";

import Link from "next/link";
import Image from "next/image";
import LanguageIcon from "@mui/icons-material/Language";
import PersonIcon from "@mui/icons-material/Person";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/services/auth.actions";
import { useState, useRef, useEffect } from "react";

const NAV_LINKS = [
  { label: "About Us", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Products", href: "#products" },
  { label: "Contact", href: "#contact" },
];

function GuestActions() {
  return (
    <div className="flex items-center gap-3 sm:gap-5">
      <Link
        href="/login"
        className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-[#1F8505] text-[#1F8505] text-sm sm:text-base font-medium no-underline hover:bg-[#1F8505] hover:text-white hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
      >
        Sign in
      </Link>
      <Link
        href="/register"
        className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm sm:text-base font-medium no-underline hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
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
    <div className="flex items-center gap-2 sm:gap-5">
      <button className="hidden sm:block w-6 h-6 text-[#79B669] cursor-pointer bg-transparent border-none p-0">
        <NotificationsNoneIcon sx={{ fontSize: 24 }} />
      </button>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 sm:py-2.5 bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] rounded-xl cursor-pointer border-none hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
        >
          <PersonIcon sx={{ fontSize: 20, color: "white" }} />
          <span className="text-white text-sm font-medium max-w-[80px] sm:max-w-[120px] truncate">{displayName}</span>
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[#DAEDD5] py-2 z-[60]">
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  return (
    <>
      <header className="fixed top-0 left-0 z-50 w-full bg-white/85 backdrop-blur-sm shadow-[0px_2px_4px_rgba(218,237,213,0.25)] border-b border-[#DAEDD5] px-4 sm:px-8 lg:px-[120px] py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo + Desktop Nav */}
          <div className="flex items-center gap-6 lg:gap-[131px]">
            <Link href="/">
              <Image
                src="/img/logo.png"
                alt="EcoWise Logo"
                width={174}
                height={39}
                priority
                className="w-[120px] sm:w-[150px] lg:w-[174px] h-auto"
              />
            </Link>
            <nav className="hidden lg:flex items-center gap-2.5">
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

          {/* Right side */}
          <div className="flex items-center gap-2 lg:gap-[60px]">
            {/* Logged-in: always show UserActions with dropdown on ALL screen sizes */}
            {/* Guest: show only on sm+, on mobile it's in the drawer */}
            {loading ? (
              <div className="hidden sm:block w-[140px] h-10" />
            ) : user ? (
              <UserActions displayName={displayName} />
            ) : (
              <div className="hidden sm:flex">
                <GuestActions />
              </div>
            )}

            <div className="hidden lg:flex items-center gap-1.5 text-[#79B669]">
              <LanguageIcon sx={{ fontSize: 24 }} />
              <span className="text-base font-medium">EN</span>
            </div>

            {/* Hamburger — visible on < lg */}
            <button
              className="lg:hidden p-1.5 text-[#79B669] border border-[#DAEDD5] rounded-lg bg-white"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon sx={{ fontSize: 24 }} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-[280px] bg-white z-50 flex flex-col shadow-[-4px_0_20px_rgba(0,0,0,0.12)] lg:hidden animate-fade-slide-in-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#DAEDD5]">
              <Image src="/img/logo.png" alt="EcoWise Logo" width={120} height={27} className="h-auto" />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 text-[#79B669] bg-transparent border-none cursor-pointer"
                aria-label="Close menu"
              >
                <CloseIcon sx={{ fontSize: 24 }} />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex flex-col p-4 gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-3 text-[#79B669] text-base font-medium no-underline hover:text-[#1F8505] hover:bg-[#f0f9ed] rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Auth section at bottom */}
            <div className="p-4 mt-auto border-t border-[#DAEDD5]">
              {loading ? null : user ? (
                <div className="flex flex-col gap-3">
                  {/* User info */}
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-[#f0f9ed] rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] flex items-center justify-center shrink-0">
                      <PersonIcon sx={{ fontSize: 20, color: "white" }} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[#155A03] text-sm font-semibold truncate">{displayName}</span>
                      <span className="text-[#79B669] text-xs truncate">{user.email}</span>
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center px-5 py-2.5 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-base font-medium no-underline"
                  >
                    Dashboard
                  </Link>
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="w-full px-5 py-2.5 rounded-xl border border-red-300 text-red-500 bg-transparent cursor-pointer text-base font-medium"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center px-5 py-2.5 rounded-xl border border-[#1F8505] text-[#1F8505] text-base font-medium no-underline hover:bg-[#1F8505] hover:text-white transition-all"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center px-5 py-2.5 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-base font-medium no-underline"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
