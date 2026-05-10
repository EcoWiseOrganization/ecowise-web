import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";

/**
 * Lightweight shell shared by public marketing pages
 * (/about, /services, /contact). Keeps Header padding consistent.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full relative bg-white overflow-hidden min-h-screen flex flex-col">
      <Header />
      <main className="pt-[61px] sm:pt-[69px] lg:pt-[71px] flex-1">{children}</main>
      <Footer />
    </div>
  );
}
