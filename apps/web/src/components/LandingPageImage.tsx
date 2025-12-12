import Image from "next/image";

interface LandingPageImageProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  opacity?: number;
  mobileOpacity?: number;
  zIndex?: number;
  className?: string;
}

export default function LandingPageImage({
  src,
  alt = "Background decoration",
  width = 200,
  height = 200,
  top,
  right,
  bottom,
  left,
  opacity = 0.6,
  mobileOpacity,
  zIndex = 1,
  className = "",
}: LandingPageImageProps) {
  const positionStyles: React.CSSProperties = {
    top,
    right,
    bottom,
    left,
    opacity,
    zIndex,
    ...(mobileOpacity !== undefined && {
      ["--mobile-opacity" as string]: mobileOpacity,
    }),
  };

  return (
    <div
      className={`absolute pointer-events-none ${mobileOpacity !== undefined ? "responsive-opacity" : ""} ${className}`}
      style={positionStyles}
    >
      <style jsx>{`
        @media (max-width: 768px) {
          .responsive-opacity {
            opacity: var(--mobile-opacity) !important;
          }
        }
      `}</style>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        unoptimized
        priority
      />
    </div>
  );
}
