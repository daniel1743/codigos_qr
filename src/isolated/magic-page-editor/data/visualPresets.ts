import type { CardPaletteValues, PaletteFamily, PalettePreset } from "../types/editor";

type FamilySpec = PaletteFamily & { hues: number[]; saturations: number[] };
const profiles = [
  { id: "light", page: 97, surface: 99, accent: 42 },
  { id: "soft", page: 92, surface: 98, accent: 48 },
  { id: "medium", page: 84, surface: 94, accent: 54 },
  { id: "rich", page: 25, surface: 19, accent: 64 },
  { id: "dark", page: 13, surface: 18, accent: 70 },
  { id: "premium", page: 7, surface: 12, accent: 76 },
] as const;

export const colorFamilies: FamilySpec[] = [
  {
    id: "yellow-gold",
    label: "Amarillo / Gold",
    variants: ["Champagne", "Amber", "Mustard", "Gold", "Bronze", "Black Gold"],
    hues: [38, 35, 48, 43, 28, 42],
    saturations: [35, 78, 72, 88, 68, 82],
  },
  {
    id: "white-premium",
    label: "Blanco Premium",
    variants: ["Ivory", "Pearl", "Warm White", "Editorial White", "White Silver", "White Gold"],
    hues: [42, 30, 36, 0, 215, 45],
    saturations: [24, 12, 18, 0, 8, 28],
  },
  {
    id: "gray-premium",
    label: "Gris Premium",
    variants: ["Mist", "Silver", "Steel", "Graphite", "Charcoal", "Black Silver"],
    hues: [210, 215, 205, 220, 210, 215],
    saturations: [10, 12, 18, 18, 10, 22],
  },
  {
    id: "red",
    label: "Rojo",
    variants: ["Rose", "Coral Red", "Classic Red", "Wine", "Burgundy", "Black Red"],
    hues: [350, 4, 0, 345, 338, 355],
    saturations: [58, 76, 86, 68, 64, 82],
  },
  {
    id: "green",
    label: "Verde",
    variants: ["Sage", "Olive", "Emerald", "Forest", "Deep Green", "Black Emerald"],
    hues: [100, 78, 158, 145, 150, 160],
    saturations: [28, 48, 78, 62, 72, 82],
  },
  {
    id: "blue",
    label: "Azul",
    variants: ["Ice Blue", "Sky", "Royal Blue", "Cobalt", "Navy", "Black Blue"],
    hues: [202, 200, 224, 218, 220, 216],
    saturations: [48, 72, 86, 88, 72, 82],
  },
  {
    id: "purple",
    label: "Morado",
    variants: ["Lavender", "Lilac", "Violet", "Purple", "Plum", "Black Purple"],
    hues: [265, 282, 275, 270, 320, 286],
    saturations: [48, 58, 72, 78, 58, 82],
  },
  {
    id: "cyan-teal",
    label: "Turquesa / Cyan",
    variants: ["Aqua", "Mint Cyan", "Cyan", "Teal", "Deep Teal", "Neon Dark"],
    hues: [188, 165, 185, 180, 174, 160],
    saturations: [66, 56, 88, 72, 76, 86],
  },
  {
    id: "earth",
    label: "Tierra",
    variants: ["Sand", "Clay", "Terracotta", "Rust", "Chocolate", "Dark Earth"],
    hues: [35, 24, 18, 14, 25, 20],
    saturations: [44, 58, 70, 78, 62, 72],
  },
  {
    id: "pink",
    label: "Rosa",
    variants: ["Blush", "Dusty Rose", "Pink", "Soft Fuchsia", "Berry", "Dark Pink"],
    hues: [350, 345, 332, 320, 335, 325],
    saturations: [48, 42, 78, 82, 64, 86],
  },
  {
    id: "orange-copper",
    label: "Naranja / Cobre",
    variants: ["Peach", "Apricot", "Orange", "Copper", "Burnt Orange", "Black Copper"],
    hues: [20, 28, 24, 22, 16, 20],
    saturations: [58, 70, 88, 68, 78, 82],
  },
  {
    id: "black-premium",
    label: "Negro Premium",
    variants: [
      "Black White",
      "Black Gold",
      "Black Silver",
      "Black Red",
      "Black Emerald",
      "Black Neon",
    ],
    hues: [0, 42, 215, 355, 158, 160],
    saturations: [0, 82, 22, 82, 82, 88],
  },
];

function hsl(h: number, s: number, l: number): string {
  const a = (s * Math.min(l, 100 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return `#${[f(0), f(8), f(4)]
    .map((v) =>
      Math.round(255 * v)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`.toUpperCase();
}

function readableOn(color: string): string {
  const rgb = color
    .match(/[A-Fa-f0-9]{2}/g)
    ?.slice(-3)
    .map((v) => parseInt(v, 16) / 255) ?? [0, 0, 0];
  const lum = rgb.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  return lum > 0.58 ? "#171717" : "#FFFFFF";
}

function mix(a: string, b: string, amount: number): string {
  const aa = a.match(/[A-Fa-f0-9]{2}/g)?.map((v) => parseInt(v, 16)) ?? [255, 255, 255];
  const bb = b.match(/[A-Fa-f0-9]{2}/g)?.map((v) => parseInt(v, 16)) ?? [0, 0, 0];
  return `#${aa
    .map((v, i) =>
      Math.round(v * (1 - amount) + bb[i] * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`.toUpperCase();
}

function makePalette(family: FamilySpec, index: number): PalettePreset {
  const profile = profiles[index];
  const accent = hsl(family.hues[index], family.saturations[index], profile.accent);
  const page = hsl(family.hues[index], family.saturations[index], profile.page);
  const surface = hsl(
    family.hues[index],
    Math.max(4, family.saturations[index] - 8),
    profile.surface,
  );
  const secondarySurface = hsl(
    family.hues[index],
    Math.max(5, family.saturations[index] - 4),
    Math.max(8, profile.surface - (index < 3 ? 7 : -6)),
  );
  const fg = readableOn(page);
  const muted = fg === "#FFFFFF" ? mix("#FFFFFF", page, 0.62) : mix("#111111", page, 0.46);
  const accentFg = readableOn(accent);
  const line = mix(page, accent, index < 3 ? 0.18 : 0.45);
  return {
    id: `${family.id}-${profile.id}`,
    label: family.variants[index],
    familyId: family.id,
    variantId: profile.id,
    accent,
    accentFg,
    swatches: [page, surface, secondarySurface, accent, fg],
    page: {
      id: `${family.id}-${profile.id}`,
      label: family.variants[index],
      color: page,
      fg,
      muted,
      surface,
      line,
    },
    semantic: {
      pageBackground: page,
      surface,
      secondarySurface,
      text: fg,
      muted,
      accent,
      accentFg,
      line,
      ctaBackground: accent,
      ctaForeground: accentFg,
      iconSurface: secondarySurface,
      iconForeground: accentFg,
    },
  };
}

export const visualPalettes: PalettePreset[] = colorFamilies.flatMap((family) =>
  family.variants.map((_, index) => makePalette(family, index)),
);
export const visualPaletteById: Record<string, PalettePreset> = Object.fromEntries(
  visualPalettes.map((palette) => [palette.id, palette]),
);

export const legacyPaletteMap: Record<string, string> = {
  cream: "white-premium-light",
  black: "black-premium-rich",
  teal: "cyan-teal-rich",
  sage: "green-light",
  silver: "gray-premium-soft",
  caramel: "earth-rich",
  "warm-cream": "white-premium-light",
  "luxury-black": "black-premium-rich",
  "deep-teal": "cyan-teal-rich",
  "sage-editorial": "green-light",
  "silver-minimal": "gray-premium-soft",
  "caramel-beauty": "earth-rich",
  "red-energy": "red-medium",
  "amber-sunny": "yellow-gold-soft",
  "lavender-soft": "purple-light",
  "purple-editorial": "purple-rich",
  "cyan-electric": "cyan-teal-medium",
  "mono-editorial": "gray-premium-rich",
  "ice-blue": "blue-light",
  "emerald-deep": "green-medium",
  terracotta: "earth-medium",
  "neon-dark": "cyan-teal-premium",
};

for (const [legacyId, canonicalId] of Object.entries(legacyPaletteMap))
  visualPaletteById[legacyId] = { ...visualPaletteById[canonicalId], id: legacyId };
export const legacyVisualPalettes = Object.keys(legacyPaletteMap).map(
  (id) => visualPaletteById[id],
);

export const cardPaletteTokens: Record<string, CardPaletteValues> = Object.fromEntries(
  Object.values(visualPaletteById).map((palette) => [
    palette.id,
    {
      cardBg: palette.semantic?.surface ?? palette.page.surface,
      cardSurface: palette.semantic?.secondarySurface ?? palette.page.surface,
      cardText: palette.page.fg,
      cardMuted: palette.page.muted,
      cardLine: palette.page.line,
      cardAccent: palette.accent,
      cardAccentFg: palette.accentFg,
      cardIconBg: palette.semantic?.secondarySurface ?? palette.page.surface,
      cardIconColor: palette.accent,
    },
  ]),
);
