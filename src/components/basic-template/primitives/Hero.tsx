import type { HeroStyle } from "@/types/basic-templates";

interface HeroProps {
  src: string;
  heroStyle: HeroStyle;
  /** Page background color — used to draw the curve / fusion target. */
  background: string;
  height?: number;
  fusionStrength?: number;
}

function getFusionMask(strength: number): string | undefined {
  if (strength === 0) return undefined;
  const fadeStart = 84 - strength * 0.42;
  const softStart = Math.max(12, fadeStart - 12);
  const softEnd = Math.min(92, fadeStart + 10);
  const midEnd = Math.min(97, fadeStart + 26);
  const lateEnd = Math.min(99, fadeStart + 40);
  return `linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.995) ${softStart}%, rgba(0,0,0,0.98) ${fadeStart}%, rgba(0,0,0,0.82) ${softEnd}%, rgba(0,0,0,0.48) ${midEnd}%, rgba(0,0,0,0.14) ${lateEnd}%, transparent 100%)`;
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
export function Hero({ src, heroStyle, background, height = 260, fusionStrength = 60 }: HeroProps) {
  if (heroStyle === "fusion") {
    const mask = getFusionMask(fusionStrength);
    return (
      <div className="relative w-full shrink-0" style={{ height }}>
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
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
          <path d="M0,120 L0,64 C360,8 1080,8 1440,64 L1440,120 Z" fill={background} />
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
