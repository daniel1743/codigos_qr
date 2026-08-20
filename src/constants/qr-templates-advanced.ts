/**
 * Plantillas QR Avanzadas con degradados, efectos neón y logos demo
 * Extensión del catálogo básico para Premium
 */

import type { QRTemplate } from "./qr-templates";
import type { GradientOptions, DotsType, QREffectType } from "../types/qr-advanced";

export interface QRTemplateAdvanced extends QRTemplate {
  // Propiedades avanzadas Premium
  gradient?: GradientOptions;
  dotsType?: DotsType;
  cornersSquareType?: "square" | "extra-rounded" | "dot";
  cornersDotType?: "square" | "dot";
  effect?: QREffectType;
  demoLogoId?: string; // ID del logo demo si viene incluido
}

/**
 * PLANTILLAS PREMIUM CON DEGRADADOS
 */
export const GRADIENT_TEMPLATES: QRTemplateAdvanced[] = [
  {
    id: "sunset-pro",
    name: "Sunset Pro",
    description: "Degradado cálido de naranja a rosa, perfecto para creativos.",
    tier: "premium",
    category: "creative",
    qr_foreground_color: "#EA580C", // Base color (fallback)
    qr_background_color: "#FFFFFF",
    qr_logo_enabled: false,
    gradient: {
      type: "linear",
      rotation: 135,
      colorStops: [
        { offset: 0, color: "#EA580C" }, // Orange 600
        { offset: 1, color: "#DB2777" }, // Pink 600
      ],
    },
    dotsType: "rounded",
  },
  {
    id: "ocean-deep",
    name: "Ocean Deep",
    description: "Degradado azul profundo a cyan, elegante y moderno.",
    tier: "premium",
    category: "business",
    qr_foreground_color: "#1E40AF", // Base color (fallback)
    qr_background_color: "#FFFFFF",
    qr_logo_enabled: false,
    gradient: {
      type: "linear",
      rotation: 135,
      colorStops: [
        { offset: 0, color: "#1E40AF" }, // Blue 700
        { offset: 1, color: "#0891B2" }, // Cyan 600
      ],
    },
    dotsType: "extra-rounded",
  },
  {
    id: "forest-mist",
    name: "Forest Mist",
    description: "Verde bosque a verde claro, natural y orgánico.",
    tier: "premium",
    category: "business",
    qr_foreground_color: "#15803D", // Base color (fallback)
    qr_background_color: "#FFFFFF",
    qr_logo_enabled: false,
    gradient: {
      type: "linear",
      rotation: 180,
      colorStops: [
        { offset: 0, color: "#15803D" }, // Green 700
        { offset: 1, color: "#22C55E" }, // Green 500
      ],
    },
    dotsType: "rounded",
  },
  {
    id: "purple-rain",
    name: "Purple Rain",
    description: "Morado oscuro a lavanda, ideal para marcas premium.",
    tier: "premium",
    category: "elegant",
    qr_foreground_color: "#6B21A8", // Base color (fallback)
    qr_background_color: "#FFFFFF",
    qr_logo_enabled: false,
    gradient: {
      type: "linear",
      rotation: 135,
      colorStops: [
        { offset: 0, color: "#6B21A8" }, // Purple 800
        { offset: 1, color: "#C084FC" }, // Purple 400
      ],
    },
    dotsType: "classy-rounded",
  },
  {
    id: "fire",
    name: "Fire",
    description: "Rojo intenso a naranja brillante, apasionado y vibrante.",
    tier: "premium",
    category: "creative",
    qr_foreground_color: "#B91C1C", // Base color (fallback)
    qr_background_color: "#FFFFFF",
    qr_logo_enabled: false,
    gradient: {
      type: "radial",
      colorStops: [
        { offset: 0, color: "#B91C1C" }, // Red 700
        { offset: 1, color: "#F97316" }, // Orange 500
      ],
    },
    dotsType: "dots",
  },
  {
    id: "ice",
    name: "Ice",
    description: "Azul hielo frío, perfecto para tecnología.",
    tier: "premium",
    category: "business",
    qr_foreground_color: "#0369A1", // Base color (fallback)
    qr_background_color: "#F0F9FF",
    qr_logo_enabled: false,
    gradient: {
      type: "linear",
      rotation: 180,
      colorStops: [
        { offset: 0, color: "#0369A1" }, // Sky 700
        { offset: 1, color: "#38BDF8" }, // Sky 400
      ],
    },
    dotsType: "extra-rounded",
  },
];

/**
 * PLANTILLAS PREMIUM CON EFECTO NEÓN
 */
export const NEON_TEMPLATES: QRTemplateAdvanced[] = [
  {
    id: "neon-pink",
    name: "Neon Pink",
    description: "Rosa neón brillante con efecto glow, perfecto para música y eventos.",
    tier: "premium",
    category: "music",
    qr_foreground_color: "#DB2777",
    qr_background_color: "#FDF2F8",
    qr_logo_enabled: false,
    effect: "neon",
    dotsType: "rounded",
  },
  {
    id: "cyber-blue",
    name: "Cyber Blue",
    description: "Azul eléctrico con glow, ideal para tech y gaming.",
    tier: "premium",
    category: "creative",
    qr_foreground_color: "#2563EB",
    qr_background_color: "#EFF6FF",
    qr_logo_enabled: false,
    effect: "neon",
    dotsType: "square",
  },
  {
    id: "toxic-green",
    name: "Toxic Green",
    description: "Verde neón seguro para escaneo, moderno y llamativo.",
    tier: "premium",
    category: "creative",
    qr_foreground_color: "#16A34A",
    qr_background_color: "#F0FDF4",
    qr_logo_enabled: false,
    effect: "glow",
    dotsType: "dots",
  },
  {
    id: "ultraviolet",
    name: "Ultraviolet",
    description: "Violeta neón con glow, perfecto para eventos y entretenimiento.",
    tier: "premium",
    category: "event",
    qr_foreground_color: "#7C3AED",
    qr_background_color: "#FAF5FF",
    qr_logo_enabled: false,
    effect: "neon",
    dotsType: "rounded",
  },
];

/**
 * PLANTILLAS ELEGANTES CON LOGO DEMO
 * Nota: Los demoLogoId son placeholders, deben coincidir con IDs reales después del seed
 */
export const LOGO_TEMPLATES: QRTemplateAdvanced[] = [
  {
    id: "minimalist-pro",
    name: "Minimalist Pro",
    description: "Negro sobre blanco con logo de negocios, ultra profesional.",
    tier: "premium",
    category: "business",
    qr_foreground_color: "#0F172A",
    qr_background_color: "#FFFFFF",
    qr_logo_enabled: true,
    dotsType: "square",
    demoLogoId: "business-briefcase", // Placeholder
  },
  {
    id: "boutique-gold",
    name: "Boutique Gold",
    description: "Dorado elegante con logo de boutique, exclusivo.",
    tier: "premium",
    category: "retail",
    qr_foreground_color: "#92400E",
    qr_background_color: "#FFFBEB",
    qr_logo_enabled: true,
    dotsType: "rounded",
    cornersSquareType: "extra-rounded",
    demoLogoId: "beauty-flower", // Placeholder
  },
  {
    id: "chef-special",
    name: "Chef Special",
    description: "Terracota cálido con logo de restaurante.",
    tier: "premium",
    category: "restaurant",
    qr_foreground_color: "#9A3412",
    qr_background_color: "#FFF7ED",
    qr_logo_enabled: true,
    dotsType: "rounded",
    demoLogoId: "food-chef-hat", // Placeholder
  },
  {
    id: "beauty-essence",
    name: "Beauty Essence",
    description: "Rosa suave con logo de belleza, delicado y moderno.",
    tier: "premium",
    category: "beauty",
    qr_foreground_color: "#BE185D",
    qr_background_color: "#FCE7F3",
    qr_logo_enabled: true,
    dotsType: "classy-rounded",
    cornersSquareType: "extra-rounded",
    demoLogoId: "beauty-sparkles", // Placeholder
  },
];

/**
 * Catálogo completo de plantillas avanzadas Premium
 */
export const QR_TEMPLATES_ADVANCED: QRTemplateAdvanced[] = [
  ...GRADIENT_TEMPLATES,
  ...NEON_TEMPLATES,
  ...LOGO_TEMPLATES,
];

/**
 * Total: 14 nuevas plantillas Premium avanzadas
 * - 6 con degradados
 * - 4 con efecto neón
 * - 4 con logo demo incluido
 */
