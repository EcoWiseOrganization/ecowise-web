import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n/provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EcoWise - Carbon Footprint Management",
  description:
    "EcoWise helps you track, manage, and reduce your carbon footprint for a sustainable future.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
