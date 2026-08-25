/**
 * Template Factory — Registros verificados del renderer compartido
 * PASS C · generator-v1
 *
 * FUENTE DE VERDAD: public/template-builder.html (renderer compartido).
 * Estos registros son un espejo de solo-lectura de los valores que el renderer
 * sabe resolver. El generador NUNCA debe emitir un valor fuera de estos sets.
 *
 * Si el renderer cambia, `npm run build` no falla: la protección real es
 * `registry-parity` dentro del pipeline de QA, que compara estos IDs contra los
 * del renderer en vivo y marca FAIL si divergen.
 *
 * NOTA (desviación documentada): la spec de PASS C menciona Hugeicons como
 * librería de iconos. El renderer compartido actual almacena clases FontAwesome
 * en `links[].icon` y HTML de icono en el registro de socials. No se introduce
 * una arquitectura de iconos nueva en PASS C (regla: no inventar arquitectura).
 */

/** IDs de tema soportados por el renderer (PREMIUM_THEMES). */
export const THEME_IDS = [
  "black-gold",
  "black-silver",
  "platinum",
  "rose-gold",
  "emerald-luxury",
  "executive-blue",
  "burgundy-elegant",
  "ivory-gold",
  "graphite",
  "premium-white",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

/** Etiqueta humana de cada tema, tal como la muestra el editor. */
export const THEME_LABELS: Record<ThemeId, string> = {
  "black-gold": "Black + Gold",
  "black-silver": "Black + Silver",
  platinum: "Platinum",
  "rose-gold": "Rose Gold",
  "emerald-luxury": "Emerald Luxury",
  "executive-blue": "Executive Blue",
  "burgundy-elegant": "Burgundy Elegant",
  "ivory-gold": "Ivory + Gold",
  graphite: "Graphite",
  "premium-white": "Premium White",
};

/**
 * Valores de `appearance` que cada tema resuelve.
 * Espejo exacto de PREMIUM_THEMES[].appearance en el renderer.
 * El generador los aplica igual que `applyTheme()` del editor: merge profundo
 * sobre los defaults, y además persiste `themeId`.
 */
export interface ThemeAppearance {
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  textPrimary: string;
  textSubtitle: string;
  btnBgStart: string;
  btnBgEnd: string;
  btnBorderColor: string;
  btnTextColor: string;
  accentBgStart: string;
  accentBgEnd: string;
  accentIconColor: string;
  profileBorderColor: string;
  banner: {
    enabled: boolean;
    heightPreset: "compact" | "medium" | "large";
    positionY: number;
    imageOpacity: number;
    fusionPreset: "none" | "soft" | "medium" | "deep";
    fusionStrength: number;
  };
}

export const THEME_APPEARANCE: Record<ThemeId, ThemeAppearance> = {
  "black-gold": {
    bgStart: "#000000",
    bgMid: "#0a0a0a",
    bgEnd: "#111111",
    textPrimary: "#FFFFFF",
    textSubtitle: "#D4AF37",
    btnBgStart: "#1a1a1a",
    btnBgEnd: "#111111",
    btnBorderColor: "#D4AF37",
    btnTextColor: "#FFFFFF",
    accentBgStart: "#D4AF37",
    accentBgEnd: "#B5952F",
    accentIconColor: "#000000",
    profileBorderColor: "#D4AF37",
    banner: {
      enabled: true,
      heightPreset: "medium",
      positionY: 50,
      imageOpacity: 80,
      fusionPreset: "deep",
      fusionStrength: 80,
    },
  },
  "black-silver": {
    bgStart: "#121212",
    bgMid: "#1a1a1a",
    bgEnd: "#0f0f0f",
    textPrimary: "#FFFFFF",
    textSubtitle: "#C0C0C0",
    btnBgStart: "#222222",
    btnBgEnd: "#1a1a1a",
    btnBorderColor: "#C0C0C0",
    btnTextColor: "#FFFFFF",
    accentBgStart: "#e0e0e0",
    accentBgEnd: "#a0a0a0",
    accentIconColor: "#121212",
    profileBorderColor: "#C0C0C0",
    banner: {
      enabled: true,
      heightPreset: "medium",
      positionY: 50,
      imageOpacity: 70,
      fusionPreset: "deep",
      fusionStrength: 90,
    },
  },
  platinum: {
    bgStart: "#e5e4e2",
    bgMid: "#d8d7d5",
    bgEnd: "#c4c3c0",
    textPrimary: "#222222",
    textSubtitle: "#555555",
    btnBgStart: "#ffffff",
    btnBgEnd: "#f0f0f0",
    btnBorderColor: "#8a8d8f",
    btnTextColor: "#111111",
    accentBgStart: "#a0a3a5",
    accentBgEnd: "#7a7d7f",
    accentIconColor: "#ffffff",
    profileBorderColor: "#8a8d8f",
    banner: {
      enabled: true,
      heightPreset: "medium",
      positionY: 50,
      imageOpacity: 90,
      fusionPreset: "soft",
      fusionStrength: 50,
    },
  },
  "rose-gold": {
    bgStart: "#faf0e6",
    bgMid: "#fdf5e6",
    bgEnd: "#f5ebe0",
    textPrimary: "#4a3b3c",
    textSubtitle: "#b76e79",
    btnBgStart: "#ffffff",
    btnBgEnd: "#fffbfb",
    btnBorderColor: "#b76e79",
    btnTextColor: "#4a3b3c",
    accentBgStart: "#c98a93",
    accentBgEnd: "#a45763",
    accentIconColor: "#ffffff",
    profileBorderColor: "#b76e79",
    banner: {
      enabled: true,
      heightPreset: "medium",
      positionY: 50,
      imageOpacity: 100,
      fusionPreset: "medium",
      fusionStrength: 60,
    },
  },
  "emerald-luxury": {
    bgStart: "#042A2B",
    bgMid: "#063A3C",
    bgEnd: "#021A1B",
    textPrimary: "#FFFFFF",
    textSubtitle: "#E8D595",
    btnBgStart: "#084A4D",
    btnBgEnd: "#053133",
    btnBorderColor: "#D4AF37",
    btnTextColor: "#FFFFFF",
    accentBgStart: "#D4AF37",
    accentBgEnd: "#B5952F",
    accentIconColor: "#042A2B",
    profileBorderColor: "#D4AF37",
    banner: {
      enabled: true,
      heightPreset: "medium",
      positionY: 50,
      imageOpacity: 85,
      fusionPreset: "deep",
      fusionStrength: 85,
    },
  },
  "executive-blue": {
    bgStart: "#001f3f",
    bgMid: "#002b59",
    bgEnd: "#001122",
    textPrimary: "#FFFFFF",
    textSubtitle: "#7FDBFF",
    btnBgStart: "#003366",
    btnBgEnd: "#001f3f",
    btnBorderColor: "#0074D9",
    btnTextColor: "#FFFFFF",
    accentBgStart: "#7FDBFF",
    accentBgEnd: "#39CCCC",
    accentIconColor: "#001f3f",
    profileBorderColor: "#7FDBFF",
    banner: {
      enabled: true,
      heightPreset: "medium",
      positionY: 50,
      imageOpacity: 90,
      fusionPreset: "medium",
      fusionStrength: 70,
    },
  },
  "burgundy-elegant": {
    bgStart: "#4a0404",
    bgMid: "#5c0606",
    bgEnd: "#330202",
    textPrimary: "#FFFFFF",
    textSubtitle: "#e5b382",
    btnBgStart: "#6e0909",
    btnBgEnd: "#4a0404",
    btnBorderColor: "#e5b382",
    btnTextColor: "#FFFFFF",
    accentBgStart: "#e5b382",
    accentBgEnd: "#c49364",
    accentIconColor: "#4a0404",
    profileBorderColor: "#e5b382",
    banner: {
      enabled: true,
      heightPreset: "medium",
      positionY: 50,
      imageOpacity: 85,
      fusionPreset: "deep",
      fusionStrength: 90,
    },
  },
  "ivory-gold": {
    bgStart: "#FFFFF0",
    bgMid: "#FDFFF5",
    bgEnd: "#F0F0D8",
    textPrimary: "#2b2b2b",
    textSubtitle: "#CFB53B",
    btnBgStart: "#ffffff",
    btnBgEnd: "#fcfcfc",
    btnBorderColor: "#CFB53B",
    btnTextColor: "#111111",
    accentBgStart: "#E8D595",
    accentBgEnd: "#CFB53B",
    accentIconColor: "#ffffff",
    profileBorderColor: "#CFB53B",
    banner: {
      enabled: true,
      heightPreset: "medium",
      positionY: 50,
      imageOpacity: 100,
      fusionPreset: "soft",
      fusionStrength: 40,
    },
  },
  graphite: {
    bgStart: "#2b2b2b",
    bgMid: "#333333",
    bgEnd: "#1a1a1a",
    textPrimary: "#FFFFFF",
    textSubtitle: "#a0a0a0",
    btnBgStart: "#444444",
    btnBgEnd: "#2b2b2b",
    btnBorderColor: "#555555",
    btnTextColor: "#FFFFFF",
    accentBgStart: "#ffffff",
    accentBgEnd: "#e0e0e0",
    accentIconColor: "#111111",
    profileBorderColor: "#555555",
    banner: {
      enabled: true,
      heightPreset: "medium",
      positionY: 50,
      imageOpacity: 70,
      fusionPreset: "medium",
      fusionStrength: 75,
    },
  },
  "premium-white": {
    bgStart: "#FFFFFF",
    bgMid: "#FAFAFA",
    bgEnd: "#F0F0F0",
    textPrimary: "#111111",
    textSubtitle: "#555555",
    btnBgStart: "#FFFFFF",
    btnBgEnd: "#F9F9F9",
    btnBorderColor: "#DDDDDD",
    btnTextColor: "#111111",
    accentBgStart: "#222222",
    accentBgEnd: "#000000",
    accentIconColor: "#FFFFFF",
    profileBorderColor: "#E0E0E0",
    banner: {
      enabled: true,
      heightPreset: "medium",
      positionY: 50,
      imageOpacity: 100,
      fusionPreset: "soft",
      fusionStrength: 30,
    },
  },
};

/**
 * Presets de botón seleccionables. `legacy` existe en el renderer pero está
 * oculto en la UI (es el modo "Custom" de retrocompatibilidad), por eso el
 * generador no lo emite nunca.
 */
export const BUTTON_PRESET_IDS = [
  "solid",
  "glass",
  "outline",
  "soft",
  "premium",
  "minimal",
] as const;

export type ButtonPresetId = (typeof BUTTON_PRESET_IDS)[number];

/** Preset presente en el renderer pero no ofertable por el generador. */
export const HIDDEN_BUTTON_PRESET_IDS = ["legacy"] as const;

/**
 * Clases de icono que el renderer sabe pintar (availableIcons + ACTION_TYPES).
 * El generador valida contra este set antes de emitir `links[].icon`.
 */
export const ICON_CLASSES = [
  "fa-brands fa-facebook-f",
  "fa-brands fa-instagram",
  "fa-brands fa-whatsapp",
  "fa-regular fa-envelope",
  "fa-solid fa-location-dot",
  "fa-brands fa-tiktok",
  "fa-brands fa-youtube",
  "fa-brands fa-x-twitter",
  "fa-solid fa-globe",
  "fa-solid fa-phone",
  "fa-solid fa-bag-shopping",
  "fa-solid fa-download",
  "fa-regular fa-calendar",
] as const;

export type IconClass = (typeof ICON_CLASSES)[number];

/**
 * Fallback interno del renderer (`getActionDefaultIcon`, socials sin plataforma).
 *
 * NO está en `availableIcons`, es decir, NO aparece en el <select> de iconos del
 * editor. El generador no debe emitirlo en `links[].icon`: si lo hiciera, un
 * humano que abriera la plantilla vería el desplegable sin su valor actual.
 * Detectado por el test de paridad de registros en RECOVERY 01.
 */
export const RENDERER_INTERNAL_FALLBACK_ICON = "fa-solid fa-link" as const;

export function isKnownIcon(icon: string): icon is IconClass {
  return (ICON_CLASSES as readonly string[]).includes(icon);
}

/**
 * Tipos de acción (S9) soportados por `resolveActionHref()` en el renderer.
 * `actionType` decide cómo se construye el href final (tel:, mailto:, wa.me…).
 */
export const ACTION_TYPE_IDS = [
  "url",
  "phone",
  "email",
  "whatsapp",
  "location",
  "booking",
  "download",
] as const;

export type ActionTypeId = (typeof ACTION_TYPE_IDS)[number];

/** Icono por defecto de cada acción, igual que `getActionDefaultIcon()`. */
export const ACTION_DEFAULT_ICON: Record<ActionTypeId, IconClass> = {
  url: "fa-solid fa-globe",
  phone: "fa-solid fa-phone",
  email: "fa-regular fa-envelope",
  whatsapp: "fa-brands fa-whatsapp",
  location: "fa-solid fa-location-dot",
  booking: "fa-regular fa-calendar",
  download: "fa-solid fa-download",
};

/** Plataformas de socials soportadas por SOCIAL_PLATFORMS en el renderer. */
export const SOCIAL_PLATFORM_IDS = [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "linkedin",
  "twitter",
  "whatsapp",
  "telegram",
  "email",
  "website",
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORM_IDS)[number];

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatformId, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  email: "Email",
  website: "Website",
};

/** Valores de layout/appearance discretos aceptados por el renderer. */
export const GRID_COLS = [1, 2] as const;
export const PROFILE_RADII = ["50%", "24px", "0px"] as const;
export const BTN_RADII = ["9999px", "16px", "0px"] as const;
export const BANNER_HEIGHT_PRESETS = ["compact", "medium", "large"] as const;
export const BANNER_FUSION_PRESETS = ["none", "soft", "medium", "deep"] as const;

/** Fuentes cargadas por el <head> del renderer. */
export const FONT_LOGO_VALUES = [
  "'Cinzel', serif",
  "'Playfair Display', serif",
  "'Montserrat', sans-serif",
  "'Oswald', sans-serif",
] as const;

export const FONT_HEADING_VALUES = [
  "'Oswald', sans-serif",
  "'Poppins', sans-serif",
  "'Montserrat', sans-serif",
  "'Inter', sans-serif",
] as const;

/** Snapshot compacto para el chequeo de paridad contra el renderer en vivo. */
export const REGISTRY_SNAPSHOT = {
  themeIds: [...THEME_IDS],
  buttonPresetIds: [...BUTTON_PRESET_IDS, ...HIDDEN_BUTTON_PRESET_IDS],
  iconClasses: [...ICON_CLASSES],
  actionTypeIds: [...ACTION_TYPE_IDS],
  socialPlatformIds: [...SOCIAL_PLATFORM_IDS],
} as const;
