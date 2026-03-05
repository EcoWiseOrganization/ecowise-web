import { AuthImage } from "./AuthImage";

interface AuthLayoutProps {
  children: React.ReactNode;
  imageSrc: string;
  imageAlt: string;
  logoPosition?: "top-right" | "bottom-right";
}

export function AuthLayout({ children, imageSrc, imageAlt, logoPosition = "bottom-right" }: AuthLayoutProps) {
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative", background: "white", overflow: "hidden", display: "flex" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 387, display: "inline-flex", flexDirection: "column", gap: 46 }}>
          {children}
        </div>
      </div>
      <AuthImage src={imageSrc} alt={imageAlt} logoPosition={logoPosition} />
    </div>
  );
}
