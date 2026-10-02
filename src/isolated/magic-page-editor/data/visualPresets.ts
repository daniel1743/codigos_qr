import type { CardPaletteValues, PaletteFamily, PalettePreset } from "../types/editor";

type FamilySpec = PaletteFamily & {
  pageBackgrounds: string[];
  surfaces: string[];
  secondarySurfaces: string[];
  accents: string[];
};

const variantIds = ["light", "soft", "medium", "rich", "dark", "premium"] as const;

export const colorFamilies: FamilySpec[] = [
  {
    id: "yellow-gold",
    label: "Amarillo / Gold",
    variants: ["Champagne", "Amber", "Mustard", "Gold", "Bronze", "Black Gold"],
    pageBackgrounds: ["#FFF1D6", "#FFD27A", "#D9A72E", "#C98A16", "#85530D", "#11100D"],
    surfaces: ["#FFF9EC", "#FFE8B3", "#F7D979", "#F1C45B", "#9A6418", "#211A11"],
    secondarySurfaces: ["#F6E5C4", "#EFC060", "#C98A16", "#A9690E", "#5D370D", "#2F2618"],
    accents: ["#B77A20", "#A86608", "#8E5F00", "#F2B72E", "#D89420", "#D7A646"],
  },
  {
    id: "white-premium",
    label: "Blanco Premium",
    variants: ["Ivory", "Pearl", "Warm White", "Editorial White", "White Silver", "White Gold"],
    pageBackgrounds: ["#FFF8E9", "#F8F4EB", "#FFF9F0", "#FFFFFF", "#EEF1F4", "#FFF7E2"],
    surfaces: ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFDF7"],
    secondarySurfaces: ["#F6EEDC", "#F0EEE8", "#F8F1E7", "#F5F5F5", "#DDE2E7", "#F4E3BB"],
    accents: ["#B8935A", "#A78B65", "#C49A6C", "#222222", "#7B8794", "#B88A2B"],
  },
  {
    id: "gray-premium",
    label: "Gris Premium",
    variants: ["Mist", "Silver", "Steel", "Graphite", "Charcoal", "Black Silver"],
    pageBackgrounds: ["#E9EEF2", "#D5DCE2", "#B8C2CC", "#667381", "#303A45", "#171C22"],
    surfaces: ["#F8FAFB", "#EEF2F5", "#DDE4EA", "#4A5662", "#202932", "#252D36"],
    secondarySurfaces: ["#D7E0E7", "#C4CED7", "#98A7B5", "#35414D", "#151B21", "#303A45"],
    accents: ["#6E879A", "#668093", "#526B7D", "#B8C4CF", "#D6DEE6", "#BBC8D4"],
  },
  {
    id: "red",
    label: "Rojo",
    variants: ["Rose", "Coral Red", "Classic Red", "Wine", "Burgundy", "Black Red"],
    pageBackgrounds: ["#F8DCE2", "#F18A83", "#D83A3A", "#76283B", "#701F32", "#1D0D12"],
    surfaces: ["#FFF3F5", "#FFD4D0", "#F5A4A0", "#A65061", "#9D344D", "#32161E"],
    secondarySurfaces: ["#F0BEC8", "#D95755", "#B9232D", "#5A1D2E", "#4B1423", "#471D29"],
    accents: ["#B83D58", "#B52D3A", "#9F1725", "#D8798D", "#E05A73", "#D55A72"],
  },
  {
    id: "green",
    label: "Verde",
    variants: ["Sage", "Olive", "Emerald", "Forest", "Deep Green", "Black Emerald"],
    pageBackgrounds: ["#DCE8D9", "#9BAE63", "#159447", "#176B3A", "#0E4B32", "#0D1713"],
    surfaces: ["#F1F7EE", "#D6E0AE", "#7ACB9A", "#28674A", "#28674A", "#18271F"],
    secondarySurfaces: ["#C4D6BB", "#73873A", "#087B38", "#0F4E2B", "#0A3524", "#1E3B2B"],
    accents: ["#5E7F50", "#536B24", "#0A7335", "#39A96B", "#52B77D", "#43D98D"],
  },
  {
    id: "blue",
    label: "Azul",
    variants: ["Ice Blue", "Sky", "Royal Blue", "Cobalt", "Navy", "Black Blue"],
    pageBackgrounds: ["#DCEFF8", "#69BCEB", "#2457D6", "#174BC2", "#102B68", "#0A111F"],
    surfaces: ["#F1FAFE", "#D4F0FF", "#4A6FD0", "#214BAF", "#27458A", "#17263F"],
    secondarySurfaces: ["#C1E2F1", "#318FCE", "#1239A8", "#103594", "#0B1E4B", "#1B345A"],
    accents: ["#4B95BF", "#1479B8", "#123DB7", "#6C8DFF", "#7FA4FF", "#4B7CFF"],
  },
  {
    id: "purple",
    label: "Morado",
    variants: ["Lavender", "Lilac", "Violet", "Purple", "Plum", "Black Purple"],
    pageBackgrounds: ["#EEE6FA", "#D8C4F0", "#8956C9", "#67349B", "#51204F", "#160F1F"],
    surfaces: ["#FAF7FF", "#F0E7FA", "#7445A6", "#6A3BA0", "#753D78", "#2B1835"],
    secondarySurfaces: ["#D8C8EE", "#B998D6", "#6739A4", "#4A237A", "#381439", "#422052"],
    accents: ["#8560AE", "#7949A8", "#6429A8", "#B786F1", "#D18BE8", "#B76AF5"],
  },
  {
    id: "cyan-teal",
    label: "Turquesa / Cyan",
    variants: ["Aqua", "Mint Cyan", "Cyan", "Teal", "Deep Teal", "Neon Dark"],
    pageBackgrounds: ["#D5F3F1", "#9CE3D8", "#0ABAC2", "#147F86", "#0D5962", "#0A1718"],
    surfaces: ["#F0FFFD", "#D8F8F1", "#73E0DC", "#0E6870", "#247A7D", "#183034"],
    secondarySurfaces: ["#B8E4DD", "#5BC7B8", "#078E97", "#0B5F68", "#0A3C44", "#1B4A4F"],
    accents: ["#2A9993", "#168F7C", "#007B86", "#51D5D1", "#4BC9C3", "#5CFFD6"],
  },
  {
    id: "earth",
    label: "Tierra",
    variants: ["Sand", "Clay", "Terracotta", "Rust", "Chocolate", "Dark Earth"],
    pageBackgrounds: ["#F3E3CC", "#D6A77D", "#C36E45", "#A9492B", "#5A321F", "#21130E"],
    surfaces: ["#FFF7EA", "#F0D4B6", "#E6A27D", "#8B3D23", "#875035", "#372219"],
    secondarySurfaces: ["#E6CBAA", "#B97A4F", "#9F452B", "#7B301E", "#3D2117", "#4A2A1D"],
    accents: ["#A97843", "#95562E", "#9E3D20", "#D17A4E", "#D28A50", "#B85B35"],
  },
  {
    id: "pink",
    label: "Rosa",
    variants: ["Blush", "Dusty Rose", "Pink", "Soft Fuchsia", "Berry", "Dark Pink"],
    pageBackgrounds: ["#F7DEE6", "#E7B8C5", "#D9437C", "#A42A86", "#762558", "#24101F"],
    surfaces: ["#FFF3F6", "#F8E2E9", "#ED8DB0", "#8D246F", "#9B4D7E", "#3D1D35"],
    secondarySurfaces: ["#EBC1CC", "#C98B9E", "#B92C65", "#812060", "#531A3D", "#55234A"],
    accents: ["#B95876", "#A9536A", "#B51F5E", "#E15AC0", "#D94C9D", "#F064C2"],
  },
  {
    id: "orange-copper",
    label: "Naranja / Cobre",
    variants: ["Peach", "Apricot", "Orange", "Copper", "Burnt Orange", "Black Copper"],
    pageBackgrounds: ["#FFE6D7", "#FFC29E", "#F47A2C", "#C95B20", "#A83E12", "#24130B"],
    surfaces: ["#FFF7F0", "#FFE2CB", "#FFB57E", "#F0A06A", "#A94415", "#3D2012"],
    secondarySurfaces: ["#F8C9AD", "#E89A68", "#D85018", "#A44417", "#6E250D", "#5B2C16"],
    accents: ["#C16A43", "#C4682C", "#D84A0F", "#EE9255", "#FF9B48", "#FF7738"],
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
    pageBackgrounds: ["#17191C", "#0E0E0C", "#171A20", "#1C0D12", "#0B1711", "#111116"],
    surfaces: ["#25282D", "#211A10", "#252B35", "#32151E", "#14261C", "#24212D"],
    secondarySurfaces: ["#30343A", "#352713", "#303B4A", "#4D1A28", "#1C4A30", "#3C2A4C"],
    accents: ["#E5E7EB", "#D7A646", "#AAB8CA", "#D55A72", "#43D98D", "#D868FF"],
  },
];

function readableOn(color: string): string {
  const rgb = color
    .match(/[A-Fa-f0-9]{2}/g)
    ?.slice(-3)
    .map((v) => parseInt(v, 16) / 255) ?? [0, 0, 0];
  const channels = rgb.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  const lum = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  const whiteContrast = 1.05 / (lum + 0.05);
  const darkContrast = (lum + 0.05) / 0.05;
  return darkContrast >= whiteContrast ? "#171717" : "#FFFFFF";
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
  const page = family.pageBackgrounds[index];
  const surface = family.surfaces[index];
  const secondarySurface = family.secondarySurfaces[index];
  const accent = family.accents[index];
  const fg = readableOn(page);
  const muted = fg === "#FFFFFF" ? mix("#FFFFFF", page, 0.62) : mix("#111111", page, 0.46);
  const accentFg = readableOn(accent);
  const line = mix(page, accent, 0.5);
  return {
    id: `${family.id}-${variantIds[index]}`,
    label: family.variants[index],
    familyId: family.id,
    variantId: variantIds[index],
    accent,
    accentFg,
    swatches: [page, surface, secondarySurface, accent, fg],
    page: {
      id: `${family.id}-${variantIds[index]}`,
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
