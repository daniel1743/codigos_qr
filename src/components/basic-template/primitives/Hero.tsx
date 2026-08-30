import type { HeroStyle } from "@/types/basic-templates";

interface HeroProps {
  src: string;
  heroStyle: HeroStyle;
  /** Page background color — used to draw the curve / fusion target. */
  background: string;
  height?: number;
}

/**
 * Hero image layer.
 *
 * Hero quality rules:
 * - "fusion" fades progressively into the background (no hard line); the fade
 *   belongs EXCLUSIVELY to this layer (never to the avatar).
 * - "curved" draws a clean responsive curve (SVG, no fixed width).
 * - "straight" is a simple full-bleed rectangle.
 */
export function Hero({ src, heroStyle, background, height = 260 }: HeroProps) {
  if (heroStyle === "fusion") {
    const mask =
      "linear-gradient(to bottom, #000 0%, #000 48%, rgba(0,0,0,0.85) 72%, transparent 100%)";
    return (
      <div className="relative w-full shrink-0" style={{ height }}>
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          style={{ maskImage: mask, WebkitMaskImage: mask }}
        />
      </div>
    );
  }

  if (heroStyle === "curved") {
    return (
      <div className="relative w-full shrink-0" style={{ height }}>
        <img src={src} alt="" className="h-full w-full object-cover" />
        <svg
          className="absolute inset-x-0 bottom-0 w-full"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          style={{ height: 96 }}
          aria-hidden="true"
        >
          <path
            d="M0,120 L0,64 C360,8 1080,8 1440,64 L1440,120 Z"
            fill={background}
          />
        </svg>
      </div>
    );
  }

  // straight
  return (
    <div className="relative w-full shrink-0" style={{ height }}>
      <img src={src} alt="" className="h-full w-full object-cover" />
    </div>
  );
}
