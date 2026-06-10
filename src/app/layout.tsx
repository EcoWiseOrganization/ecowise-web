import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n/provider";
import { ToastProvider } from "@/components/ui/Toast";
import { GlobalLoadingProvider } from "@/components/shared/GlobalLoadingProvider";

// `display: "swap"` flips the font-loading behaviour from FOIT
// (Flash of Invisible Text — Inter blocks render until downloaded)
// to FOUT (system font shows, then swaps to Inter). The swap costs
// a one-frame visual jump but cuts LCP / CLS regression on cold
// loads — especially on the public landing + auth pages which are
// the first thing a new visitor sees.
//
// `preload` already defaults to `true` in next/font and matches what
// we want; spelt out so the intent reads at a glance.
//
// `variable` exposes the font as a CSS custom property in case future
// callers (e.g. tailwind 4 theme config) want to reference it by
// token instead of injecting via `className`.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EcoWise - Carbon Footprint Management",
  description:
    "EcoWise helps you track, manage, and reduce your carbon footprint for a sustainable future.",
  // Tell search engines the two supported locales — surfaces VN
  // language pages in vi-VN search results without a separate URL
  // path scheme. We don't have per-locale subroutes (i18n is
  // client-side), so both `vi` and `en` point at the same
  // canonical URL set — the alternates block just declares the
  // language the same content is available in.
  alternates: {
    languages: {
      en: "/",
      vi: "/",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <I18nProvider>
          <GlobalLoadingProvider>
            <ToastProvider>{children}</ToastProvider>
          </GlobalLoadingProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
