import type { GradientOptions } from "../types/qr-advanced";

/**
 * Presets de Colores Premium Opulentos 1000%
 * Gradientes holográficos, metálicos y efectos avanzados
 */

export const PREMIUM_GRADIENTS = {
  // Holográficos
  holographicPurple: {
    type: "linear" as const,
    rotation: 45,
    colorStops: [
      { offset: 0, color: "#8B5CF6" },
      { offset: 0.25, color: "#EC4899" },
      { offset: 0.5, color: "#3B82F6" },
      { offset: 0.75, color: "#10B981" },
      { offset: 1, color: "#F59E0B" },
    ],
  } as GradientOptions,

  holographicBlue: {
    type: "linear" as const,
    rotation: 135,
    colorStops: [
      { offset: 0, color: "#06B6D4" },
      { offset: 0.33, color: "#3B82F6" },
      { offset: 0.66, color: "#8B5CF6" },
      { offset: 1, color: "#EC4899" },
    ],
  } as GradientOptions,

  // Metálicos
  metallicGold: {
    type: "linear" as const,
    rotation: 90,
    colorStops: [
      { offset: 0, color: "#FFD700" },
      { offset: 0.2, color: "#FFA500" },
      { offset: 0.5, color: "#FFED4E" },
      { offset: 0.8, color: "#D4AF37" },
      { offset: 1, color: "#FFD700" },
    ],
  } as GradientOptions,

  metallicSilver: {
    type: "linear" as const,
    rotation: 90,
    colorStops: [
      { offset: 0, color: "#E8E8E8" },
      { offset: 0.25, color: "#FFFFFF" },
      { offset: 0.5, color: "#C0C0C0" },
      { offset: 0.75, color: "#F0F0F0" },
      { offset: 1, color: "#D3D3D3" },
    ],
  } as GradientOptions,

  metallicRoseGold: {
    type: "linear" as const,
    rotation: 45,
    colorStops: [
      { offset: 0, color: "#F4C2C2" },
      { offset: 0.33, color: "#E0A899" },
      { offset: 0.66, color: "#FFD4B8" },
      { offset: 1, color: "#F4C2C2" },
    ],
  } as GradientOptions,

  // Aurora Borealis
  aurora: {
    type: "linear" as const,
    rotation: 180,
    colorStops: [
      { offset: 0, color: "#00FFA3" },
      { offset: 0.25, color: "#03E1FF" },
      { offset: 0.5, color: "#DC1FFF" },
      { offset: 0.75, color: "#03E1FF" },
      { offset: 1, color: "#00FFA3" },
    ],
  } as GradientOptions,

  // Rainbow Premium
  rainbowPremium: {
    type: "linear" as const,
    rotation: 45,
    colorStops: [
      { offset: 0, color: "#FF0080" },
      { offset: 0.16, color: "#FF00FF" },
      { offset: 0.33, color: "#8000FF" },
      { offset: 0.5, color: "#0080FF" },
      { offset: 0.66, color: "#00FFFF" },
      { offset: 0.83, color: "#00FF80" },
      { offset: 1, color: "#80FF00" },
    ],
  } as GradientOptions,

  // Cristal
  crystal: {
    type: "radial" as const,
    colorStops: [
      { offset: 0, color: "#FFFFFF" },
      { offset: 0.3, color: "#E0F2FE" },
      { offset: 0.6, color: "#BAE6FD" },
      { offset: 1, color: "#0EA5E9" },
    ],
  } as GradientOptions,

  // Sunset Premium
  sunsetPremium: {
    type: "linear" as const,
    rotation: 135,
    colorStops: [
      { offset: 0, color: "#FF6B6B" },
      { offset: 0.33, color: "#FFD93D" },
      { offset: 0.66, color: "#FF8E53" },
      { offset: 1, color: "#C44569" },
    ],
  } as GradientOptions,

  // Ocean Premium
  oceanPremium: {
    type: "linear" as const,
    rotation: 180,
    colorStops: [
      { offset: 0, color: "#667EEA" },
      { offset: 0.33, color: "#764BA2" },
      { offset: 0.66, color: "#F093FB" },
      { offset: 1, color: "#667EEA" },
    ],
  } as GradientOptions,

  // Neon Cyberpunk
  neonCyberpunk: {
    type: "linear" as const,
    rotation: 90,
    colorStops: [
      { offset: 0, color: "#FF00FF" },
      { offset: 0.5, color: "#00FFFF" },
      { offset: 1, color: "#FF00FF" },
    ],
  } as GradientOptions,

  // Emerald Luxury
  emeraldLuxury: {
    type: "radial" as const,
    colorStops: [
      { offset: 0, color: "#10B981" },
      { offset: 0.5, color: "#059669" },
      { offset: 1, color: "#047857" },
    ],
  } as GradientOptions,

  // Ruby Luxury
  rubyLuxury: {
    type: "radial" as const,
    colorStops: [
      { offset: 0, color: "#DC2626" },
      { offset: 0.5, color: "#EF4444" },
      { offset: 1, color: "#B91C1C" },
    ],
  } as GradientOptions,

  // Sapphire Luxury
  sapphireLuxury: {
    type: "radial" as const,
    colorStops: [
      { offset: 0, color: "#3B82F6" },
      { offset: 0.5, color: "#2563EB" },
      { offset: 1, color: "#1D4ED8" },
    ],
  } as GradientOptions,
};

export const PREMIUM_EFFECTS = {
  holographic: {
    filter:
      "drop-shadow(0 0 12px rgba(139, 92, 246, 0.6)) drop-shadow(0 0 24px rgba(236, 72, 153, 0.4)) brightness(1.2)",
    animation: "holographic-shimmer 3s ease-in-out infinite",
  },
  metallicGold: {
    filter: "drop-shadow(0 4px 8px rgba(255, 215, 0, 0.5)) contrast(1.1) brightness(1.1)",
  },
  metallicSilver: {
    filter: "drop-shadow(0 4px 8px rgba(192, 192, 192, 0.5)) contrast(1.15) brightness(1.2)",
  },
  crystal: {
    filter: "drop-shadow(0 0 20px rgba(14, 165, 233, 0.4)) blur(0.5px) brightness(1.3)",
    backdropFilter: "blur(8px)",
  },
  rainbow: {
    filter: "drop-shadow(0 0 16px rgba(255, 0, 128, 0.5)) hue-rotate(0deg) brightness(1.2)",
    animation: "rainbow-rotate 4s linear infinite",
  },
  aurora: {
    filter:
      "drop-shadow(0 0 20px rgba(0, 255, 163, 0.6)) drop-shadow(0 0 40px rgba(3, 225, 255, 0.4)) brightness(1.25)",
    animation: "aurora-pulse 3s ease-in-out infinite",
  },
  neon: {
    filter: "drop-shadow(0 0 8px currentColor) brightness(1.1)",
  },
  glow: {
    filter: "drop-shadow(0 0 12px currentColor) brightness(1.15)",
  },
};

// Keyframes CSS para animaciones
export const PREMIUM_KEYFRAMES = `
@keyframes holographic-shimmer {
  0%, 100% {
    filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.6)) drop-shadow(0 0 24px rgba(236, 72, 153, 0.4)) brightness(1.2) hue-rotate(0deg);
  }
  33% {
    filter: drop-shadow(0 0 16px rgba(59, 130, 246, 0.6)) drop-shadow(0 0 28px rgba(16, 185, 129, 0.4)) brightness(1.25) hue-rotate(15deg);
  }
  66% {
    filter: drop-shadow(0 0 14px rgba(236, 72, 153, 0.6)) drop-shadow(0 0 26px rgba(245, 158, 11, 0.4)) brightness(1.22) hue-rotate(-15deg);
  }
}

@keyframes rainbow-rotate {
  0% { filter: drop-shadow(0 0 16px rgba(255, 0, 128, 0.5)) hue-rotate(0deg) brightness(1.2); }
  25% { filter: drop-shadow(0 0 18px rgba(128, 0, 255, 0.5)) hue-rotate(90deg) brightness(1.25); }
  50% { filter: drop-shadow(0 0 20px rgba(0, 128, 255, 0.5)) hue-rotate(180deg) brightness(1.3); }
  75% { filter: drop-shadow(0 0 18px rgba(0, 255, 128, 0.5)) hue-rotate(270deg) brightness(1.25); }
  100% { filter: drop-shadow(0 0 16px rgba(255, 0, 128, 0.5)) hue-rotate(360deg) brightness(1.2); }
}

@keyframes aurora-pulse {
  0%, 100% {
    filter: drop-shadow(0 0 20px rgba(0, 255, 163, 0.6)) drop-shadow(0 0 40px rgba(3, 225, 255, 0.4)) brightness(1.25);
  }
  50% {
    filter: drop-shadow(0 0 30px rgba(0, 255, 163, 0.8)) drop-shadow(0 0 60px rgba(3, 225, 255, 0.6)) brightness(1.35);
  }
}
`;
