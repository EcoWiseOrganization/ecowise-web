import Image from "next/image";

interface AuthImageProps {
  src: string;
  alt: string;
  /**
   * Retained for backwards compatibility with existing callers — the
   * brand logo is now always anchored to the bottom-center of the
   * image, so this prop has no effect.
   */
  logoPosition?: "top-right" | "bottom-right";
}

export function AuthImage({ src, alt }: AuthImageProps) {
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
        src="/img/logo.png"
        alt="EcoWise"
        width={260}
        height={58}
        priority
        style={{
          position: "absolute",
          zIndex: 1,
          left: "50%",
          bottom: 40,
          transform: "translateX(-50%)",
          width: 220,
          height: "auto",
          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.25))",
        }}
      />
    </div>
  );
}
