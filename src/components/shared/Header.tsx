"use client";

import Link from "next/link";
import Image from "next/image";
import LanguageIcon from "@mui/icons-material/Language";

const NAV_LINKS = [
  { label: "About Us", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Products", href: "#products" },
  { label: "Contact", href: "#contact" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-sm shadow-[0px_2px_4px_rgba(218,237,213,0.25)] border-b border-[#DAEDD5] px-[120px] py-4">
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
          <div className="flex items-center gap-1.5 text-[#79B669]">
            <LanguageIcon sx={{ fontSize: 24 }} />
            <span className="text-base font-medium">EN</span>
          </div>
        </div>
      </div>
    </header>
  );
}
