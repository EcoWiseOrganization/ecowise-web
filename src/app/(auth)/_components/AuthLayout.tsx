import { AuthImage } from "./AuthImage";

interface AuthLayoutProps {
  children: React.ReactNode;
  imageSrc: string;
  imageAlt: string;
  logoPosition?: "top-right" | "bottom-right";
}

export function AuthLayout({ children, imageSrc, imageAlt, logoPosition = "bottom-right" }: AuthLayoutProps) {
  return (
    <div className="w-full min-h-screen relative bg-white overflow-hidden flex">
      <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-10 lg:px-0">
        <div className="animate-fade-slide-in-left w-full max-w-[387px] flex flex-col gap-8 sm:gap-[46px]">
          {children}
        </div>
      </div>
      <AuthImage src={imageSrc} alt={imageAlt} logoPosition={logoPosition} />
    </div>
  );
}
