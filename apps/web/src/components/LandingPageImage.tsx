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
  };

  return (
    <div
      className={`absolute pointer-events-none ${className}`}
      style={positionStyles}
    >
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
