import { useMemo } from "react";
import type { Profile } from "../../types/database";

export function PremiumDecorativeLayer({
  profile,
  accentColor,
}: {
  profile: Partial<Profile>;
  accentColor: string;
}) {
  const shape = profile.decor_shape || "none";
  const particles = profile.decor_particles || "none";
  const smoke = profile.decor_smoke || "none";
  const shadow = profile.decor_shadow || "none";
  const intensity = profile.decor_intensity || "subtle";

  const opacityValue = intensity === "strong" ? 0.7 : intensity === "medium" ? 0.45 : 0.25;

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1] as string, 16)}, ${parseInt(result[2] as string, 16)}, ${parseInt(result[3] as string, 16)}`
      : "255, 255, 255";
  };

  const accentRgb = hexToRgb(accentColor);

  const particleDots = useMemo(() => {
    const count = intensity === "strong" ? 64 : intensity === "medium" ? 42 : 26;
    const baseOpacity = intensity === "strong" ? 0.55 : intensity === "medium" ? 0.38 : 0.25;

    return Array.from({ length: count }, (_, index) => ({
      x: (index * 29 + 11) % 100,
      y: (index * 47 + 23) % 100,
      radius: 0.25 + (index % 4) * 0.12,
      opacity: baseOpacity * (0.55 + (index % 5) * 0.1),
    }));
  }, [intensity]);

  if (shape === "none" && particles === "none" && smoke === "none" && shadow === "none") {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ opacity: opacityValue }}
      aria-hidden="true"
    >
      {/* Background particles */}
      {particles === "dots" && (
        <svg
          className="absolute inset-0 z-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {particleDots.map((dot, index) => (
            <circle
              key={`${dot.x}-${dot.y}-${index}`}
              cx={dot.x}
              cy={dot.y}
              r={dot.radius}
              fill={`rgba(${accentRgb}, ${dot.opacity})`}
            />
          ))}
        </svg>
      )}

      {/* Advanced SVG Shapes */}
      {(shape === "circles" || shape === "mixed") && (
        <svg
          className="absolute inset-0 h-full w-full opacity-60"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          <circle
            cx="90"
            cy="15"
            r="25"
            fill="none"
            stroke={`rgba(${accentRgb}, 0.3)`}
            strokeWidth="0.5"
          />
          <circle
            cx="90"
            cy="15"
            r="35"
            fill="none"
            stroke={`rgba(${accentRgb}, 0.15)`}
            strokeWidth="0.2"
          />
          <circle
            cx="-5"
            cy="40"
            r="18"
            fill="none"
            stroke={`rgba(${accentRgb}, 0.4)`}
            strokeWidth="1"
            strokeDasharray="4 2"
          />
          <circle cx="85" cy="85" r="6" fill={`rgba(${accentRgb}, 0.5)`} />
        </svg>
      )}

      {(shape === "squares" || shape === "mixed") && (
        <svg
          className="absolute inset-0 h-full w-full opacity-60"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          <rect
            x="-10"
            y="25"
            width="20"
            height="20"
            transform="rotate(15 -10 25)"
            fill="none"
            stroke={`rgba(${accentRgb}, 0.4)`}
            strokeWidth="0.8"
          />
          <rect
            x="-5"
            y="30"
            width="20"
            height="20"
            transform="rotate(15 -5 30)"
            fill="none"
            stroke={`rgba(${accentRgb}, 0.2)`}
            strokeWidth="0.5"
          />
          <rect
            x="80"
            y="65"
            width="15"
            height="15"
            transform="rotate(-20 80 65)"
            fill={`rgba(${accentRgb}, 0.3)`}
          />
          <rect
            x="83"
            y="68"
            width="15"
            height="15"
            transform="rotate(-20 83 68)"
            fill="none"
            stroke={`rgba(${accentRgb}, 0.5)`}
            strokeWidth="0.5"
          />
        </svg>
      )}

      {(shape === "lines" || shape === "mixed") && (
        <svg
          className="absolute inset-0 h-full w-full opacity-60"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M -10 20 Q 30 10 50 30 T 110 20"
            fill="none"
            stroke={`rgba(${accentRgb}, 0.3)`}
            strokeWidth="0.5"
            strokeDasharray="2 2"
          />
          <path
            d="M -10 23 Q 30 13 50 33 T 110 23"
            fill="none"
            stroke={`rgba(${accentRgb}, 0.15)`}
            strokeWidth="0.2"
          />
          <line
            x1="70"
            y1="50"
            x2="110"
            y2="40"
            stroke={`rgba(${accentRgb}, 0.4)`}
            strokeWidth="1"
          />
          <line
            x1="20"
            y1="80"
            x2="50"
            y2="85"
            stroke={`rgba(${accentRgb}, 0.5)`}
            strokeWidth="0.5"
            strokeDasharray="1 3"
          />
        </svg>
      )}

      {/* Advanced Ambient Smoke */}
      {smoke === "soft" && (
        <>
          <div
            className="absolute -left-20 top-10 h-72 w-96 rounded-full blur-[80px] mix-blend-screen"
            style={{ backgroundColor: `rgba(${accentRgb}, 0.25)` }}
          />
          <div
            className="absolute -right-20 bottom-10 h-80 w-[400px] rounded-full blur-[100px] mix-blend-screen"
            style={{ backgroundColor: `rgba(${accentRgb}, 0.2)` }}
          />
        </>
      )}

      {/* Advanced Shadow Drop */}
      {shadow === "soft" && (
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent mix-blend-multiply" />
      )}
    </div>
  );
}
