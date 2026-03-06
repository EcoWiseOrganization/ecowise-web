import Image from "next/image";

interface AuthImageProps {
  src: string;
  alt: string;
  logoPosition?: "top-right" | "bottom-right";
}

export function AuthImage({ src, alt, logoPosition = "bottom-right" }: AuthImageProps) {
  const positionStyle: React.CSSProperties =
    logoPosition === "top-right"
      ? { right: 40, top: 58 }
      : { right: 40, bottom: 58 };

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
      <span
        style={{
          position: "absolute",
          zIndex: 1,
          color: "white",
          fontSize: 32,
          fontFamily: "Inter",
          fontWeight: 700,
          fontStyle: "italic",
          letterSpacing: 1,
          textShadow: "0 2px 8px rgba(0,0,0,0.3)",
          ...positionStyle,
        }}
      >
        ecowise
      </span>
    </div>
  );
}
