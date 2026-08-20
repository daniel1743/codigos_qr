import type { Profile } from "../../types/database";

export interface TemplateStyle {
  font_family: string;
  background_color: string;
  button_color: string;
  button_text_color: string;
  button_radius: Profile["button_radius"];
  button_style: Profile["button_style"];
}

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  family: string;
  style: TemplateStyle;
}

type TemplateFamily = {
  id: string;
  name: string;
  description: string;
  fonts: string[];
  palettes: Array<{
    name: string;
    background: string;
    button: string;
    buttonText: string;
  }>;
  radii: Profile["button_radius"][];
  buttonStyles: Profile["button_style"][];
};

const TEMPLATE_TARGET = 120;

const TEMPLATE_FAMILIES: TemplateFamily[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Limpio, universal y fácil de leer.",
    fonts: ["Inter", "Manrope", "DM Sans", "Public Sans"],
    palettes: [
      { name: "Ink", background: "#FFFFFF", button: "#111111", buttonText: "#FFFFFF" },
      { name: "Mist", background: "#F8FAFC", button: "#0F172A", buttonText: "#FFFFFF" },
      { name: "Paper", background: "#F7F7F5", button: "#1F2937", buttonText: "#FFFFFF" },
    ],
    radii: ["rounded", "full"],
    buttonStyles: ["solid", "outline", "card"],
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Tipográfico, sobrio y sofisticado.",
    fonts: ["Playfair Display", "Lora", "Cormorant Garamond", "Libre Baskerville"],
    palettes: [
      { name: "Ivory", background: "#F3EEE6", button: "#181818", buttonText: "#181818" },
      { name: "Linen", background: "#F8F5EF", button: "#2B211B", buttonText: "#2B211B" },
      { name: "Stone", background: "#ECE9E2", button: "#151515", buttonText: "#151515" },
    ],
    radii: ["none", "rounded"],
    buttonStyles: ["line", "minimal", "outline"],
  },
  {
    id: "luxury",
    name: "Luxury",
    description: "Premium, reservado y de alto contraste.",
    fonts: ["Cormorant Garamond", "Playfair Display", "Fraunces", "Libre Baskerville"],
    palettes: [
      { name: "Noir", background: "#111111", button: "#F8F5EF", buttonText: "#111111" },
      { name: "Burgundy", background: "#2A0F16", button: "#F7E7CE", buttonText: "#2A0F16" },
      { name: "Navy", background: "#0F172A", button: "#F8FAFC", buttonText: "#0F172A" },
      { name: "Champagne", background: "#F7EFE7", button: "#6B3F2A", buttonText: "#FFFFFF" },
    ],
    radii: ["rounded", "full"],
    buttonStyles: ["solid", "outline", "card"],
  },
  {
    id: "beauty",
    name: "Beauty",
    description: "Suave, moderno y delicado.",
    fonts: ["DM Sans", "Poppins", "Nunito Sans", "Raleway"],
    palettes: [
      { name: "Rose", background: "#F8EFEC", button: "#5C4138", buttonText: "#FFFFFF" },
      { name: "Blush", background: "#FFF1F2", button: "#BE3455", buttonText: "#FFFFFF" },
      { name: "Peach", background: "#FFF4EC", button: "#A24B2A", buttonText: "#FFFFFF" },
    ],
    radii: ["rounded", "full"],
    buttonStyles: ["solid", "soft", "pill"],
  },
  {
    id: "business",
    name: "Business",
    description: "Profesional sin sentirse corporativo.",
    fonts: ["Inter", "IBM Plex Sans", "Source Sans 3", "Roboto"],
    palettes: [
      { name: "Slate", background: "#F6F8FA", button: "#172033", buttonText: "#FFFFFF" },
      { name: "Blue", background: "#EEF4FF", button: "#1D4ED8", buttonText: "#FFFFFF" },
      { name: "Graphite", background: "#F8FAFC", button: "#0F172A", buttonText: "#FFFFFF" },
    ],
    radii: ["rounded", "full"],
    buttonStyles: ["solid", "card", "outline"],
  },
  {
    id: "creator",
    name: "Creator",
    description: "Directo, social y versátil.",
    fonts: ["Manrope", "Montserrat", "Space Grotesk", "Urbanist"],
    palettes: [
      { name: "Mono", background: "#F7F7F7", button: "#111111", buttonText: "#FFFFFF" },
      {
        name: "Sky",
        background: "linear-gradient(135deg, #2563EB, #06B6D4)",
        button: "#FFFFFF",
        buttonText: "#164E63",
      },
      {
        name: "Violet",
        background: "linear-gradient(135deg, #111827, #4C1D95)",
        button: "#F8FAFC",
        buttonText: "#111827",
      },
    ],
    radii: ["rounded", "full"],
    buttonStyles: ["solid", "pill", "card"],
  },
  {
    id: "wellness",
    name: "Wellness",
    description: "Natural, claro y confiable.",
    fonts: ["Nunito Sans", "Quicksand", "Lato", "Cabin"],
    palettes: [
      { name: "Sage", background: "#EEF7F1", button: "#1F6F50", buttonText: "#FFFFFF" },
      { name: "Sand", background: "#F7F0E6", button: "#75624A", buttonText: "#FFFFFF" },
      { name: "Calm", background: "#EFF6F4", button: "#0F766E", buttonText: "#FFFFFF" },
    ],
    radii: ["rounded", "full"],
    buttonStyles: ["solid", "soft", "card"],
  },
  {
    id: "restaurant",
    name: "Restaurant",
    description: "Cálido para menú, pedidos y reservas.",
    fonts: ["Lora", "Bitter", "Nunito", "DM Sans"],
    palettes: [
      { name: "Terracotta", background: "#FFF7ED", button: "#9A3412", buttonText: "#FFFFFF" },
      { name: "Olive", background: "#F4F1E8", button: "#4D5B32", buttonText: "#FFFFFF" },
      { name: "Cafe", background: "#F5EBDD", button: "#5F3824", buttonText: "#FFFFFF" },
    ],
    radii: ["rounded", "full"],
    buttonStyles: ["solid", "soft", "card"],
  },
  {
    id: "music",
    name: "Music",
    description: "Nocturno, expresivo y escénico.",
    fonts: ["Montserrat", "Oswald", "Bebas Neue", "Anton"],
    palettes: [
      { name: "Club", background: "#101010", button: "#FFFFFF", buttonText: "#111111" },
      {
        name: "Neon",
        background: "linear-gradient(135deg, #020617, #701A75)",
        button: "#22D3EE",
        buttonText: "#020617",
      },
      {
        name: "Stage",
        background: "linear-gradient(135deg, #111827, #7C2D12)",
        button: "#FDBA74",
        buttonText: "#111827",
      },
    ],
    radii: ["rounded", "full"],
    buttonStyles: ["solid", "pill", "outline"],
  },
  {
    id: "fashion",
    name: "Fashion",
    description: "Editorial, visual y de marca.",
    fonts: ["Raleway", "Playfair Display", "Fraunces", "Montserrat"],
    palettes: [
      { name: "Mono", background: "#FFFFFF", button: "#111111", buttonText: "#FFFFFF" },
      { name: "Cream", background: "#F8F5EF", button: "#3A2C25", buttonText: "#FFFFFF" },
      { name: "Pink", background: "#FFF1F5", button: "#9D174D", buttonText: "#FFFFFF" },
    ],
    radii: ["none", "rounded", "full"],
    buttonStyles: ["solid", "outline", "minimal"],
  },
  {
    id: "tech",
    name: "Tech",
    description: "Digital, nítido y contemporáneo.",
    fonts: ["Space Grotesk", "IBM Plex Sans", "Inter", "Lexend"],
    palettes: [
      { name: "Blue", background: "#EEF4FF", button: "#2563EB", buttonText: "#FFFFFF" },
      {
        name: "Cyber",
        background: "linear-gradient(135deg, #0F172A, #2563EB)",
        button: "#FFFFFF",
        buttonText: "#1E3A8A",
      },
      { name: "Mint", background: "#ECFEFF", button: "#0E7490", buttonText: "#FFFFFF" },
    ],
    radii: ["rounded", "full"],
    buttonStyles: ["solid", "pill", "card"],
  },
  {
    id: "event",
    name: "Event",
    description: "Claro para fechas, entradas y agenda.",
    fonts: ["Urbanist", "Prompt", "Montserrat", "Poppins"],
    palettes: [
      {
        name: "Night",
        background: "linear-gradient(135deg, #0F172A, #2563EB)",
        button: "#FFFFFF",
        buttonText: "#1E3A8A",
      },
      {
        name: "Sunset",
        background: "linear-gradient(135deg, #FB7185, #FDBA74)",
        button: "#7C2D12",
        buttonText: "#FFFFFF",
      },
      { name: "Paper", background: "#F8FAFC", button: "#7C3AED", buttonText: "#FFFFFF" },
    ],
    radii: ["rounded", "full"],
    buttonStyles: ["solid", "pill", "soft"],
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "Limpio para trabajos y servicios.",
    fonts: ["Raleway", "Work Sans", "Karla", "Source Sans 3"],
    palettes: [
      { name: "White", background: "#FFFFFF", button: "#334155", buttonText: "#334155" },
      { name: "Stone", background: "#F5F5F4", button: "#292524", buttonText: "#292524" },
      { name: "Indigo", background: "#EEF2FF", button: "#4338CA", buttonText: "#FFFFFF" },
    ],
    radii: ["none", "rounded"],
    buttonStyles: ["outline", "minimal", "card"],
  },
  {
    id: "personal-brand",
    name: "Personal Brand",
    description: "Cercano para expertos y consultores.",
    fonts: ["Plus Jakarta Sans", "Manrope", "Lato", "Open Sans"],
    palettes: [
      { name: "Trust", background: "#F8FAFC", button: "#0F766E", buttonText: "#FFFFFF" },
      { name: "Warm", background: "#FFF7ED", button: "#C2410C", buttonText: "#FFFFFF" },
      { name: "Authority", background: "#EFF6FF", button: "#1E40AF", buttonText: "#FFFFFF" },
    ],
    radii: ["rounded", "full"],
    buttonStyles: ["solid", "soft", "card"],
  },
];

const contrastCache = new Map<string, number>();

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return null;
  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function luminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1;
  const values = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0]! + 0.7152 * values[1]! + 0.0722 * values[2]!;
}

function contrastRatio(a: string, b: string) {
  const key = `${a}:${b}`;
  const cached = contrastCache.get(key);
  if (cached) return cached;
  const l1 = luminance(a);
  const l2 = luminance(b);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  contrastCache.set(key, ratio);
  return ratio;
}

function isReadable(style: TemplateStyle) {
  if (
    style.button_style === "line" ||
    style.button_style === "minimal" ||
    style.button_style === "outline"
  ) {
    return true;
  }
  return contrastRatio(style.button_color, style.button_text_color) >= 4.5;
}

function visualSignature(style: TemplateStyle) {
  return [
    style.font_family,
    style.background_color,
    style.button_color,
    style.button_text_color,
    style.button_radius,
    style.button_style,
  ].join("|");
}

function makePreset(
  family: TemplateFamily,
  font: string,
  palette: TemplateFamily["palettes"][number],
  radius: Profile["button_radius"],
  buttonStyle: Profile["button_style"],
  index: number,
): TemplatePreset {
  return {
    id: `${family.id}-${palette.name.toLowerCase()}-${index + 1}`,
    name: `${family.name} ${palette.name}`,
    description: family.description,
    family: family.name,
    style: {
      font_family: font,
      background_color: palette.background,
      button_color: palette.button,
      button_text_color: palette.buttonText,
      button_radius: radius,
      button_style: buttonStyle,
    },
  };
}

function generateTemplates(limit = TEMPLATE_TARGET): TemplatePreset[] {
  const output: TemplatePreset[] = [];
  const signatures = new Set<string>();

  for (const family of TEMPLATE_FAMILIES) {
    let localIndex = 0;
    for (const palette of family.palettes) {
      for (const font of family.fonts) {
        const radius = family.radii[localIndex % family.radii.length]!;
        const buttonStyle = family.buttonStyles[localIndex % family.buttonStyles.length]!;
        const preset = makePreset(family, font, palette, radius, buttonStyle, localIndex);
        const signature = visualSignature(preset.style);

        localIndex += 1;
        if (signatures.has(signature) || !isReadable(preset.style)) continue;

        signatures.add(signature);
        output.push(preset);
        if (output.length >= limit) return output;
      }
    }
  }

  return output;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = generateTemplates();

export const TEMPLATE_FAMILY_OPTIONS = TEMPLATE_FAMILIES.map((family) => ({
  id: family.id,
  name: family.name,
}));
