import Image from "next/image";

interface AuthImageProps {
  src: string;
  alt: string;
  /**
   * Where to anchor the EcoWise logo on the image. "top-*" pins to
   * top-center, "bottom-*" pins to bottom-center — historically the
   * `-right` suffix encoded the original corner anchor; we now ignore
   * the horizontal half and always center the logo.
   */
  logoPosition?: "top-right" | "bottom-right";
}

export function AuthImage({ src, alt, logoPosition = "bottom-right" }: AuthImageProps) {
  const verticalAnchor: React.CSSProperties = logoPosition === "top-right"
    ? { top: 40 }
    : { bottom: 40 };

  return (
    <div className="hidden lg:block animate-fade-slide-in-right" style={{ width: 710, position: "relative", flexShrink: 0 }}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        style={{ borderTopLeftRadius: 24, borderBottomLeftRadius: 24 }}
        priority
      />
      <Image
        src="/img/logo-auth.png"
        alt="EcoWise"
        width={260}
        height={58}
        priority
        style={{
          position: "absolute",
          zIndex: 1,
          left: "50%",
          transform: "translateX(-50%)",
          width: 220,
          height: "auto",
          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.25))",
          ...verticalAnchor,
        }}
      />
    </div>
  );
}
