import type { CardPaletteValues, PaletteFamily, PalettePreset } from '../types/editor';

/**
 * Shared Magic landing palettes. They are optional PageDoc props, so legacy
 * pages keep their theme. Two systems coexist here:
 *
 * 1. `visualPalettes` — the named themes (`Warm Cream`, `Luxury Black`…), 16
 *    hand-written palettes. Their ids and hex values are a compatibility
 *    contract: saved pages resolve against the same ids and never silently
 *    remap to a different look.
 * 2. `colorFamilies` / `familyPalettes` — the 12 colour directions with six
 *    generated variants each (72 palettes), recovered from the original family
 *    matrix. Same `PalettePreset` shape, plus `familyId` / `variantId` /
 *    `semantic`.
 *
 * `visualPaletteById` is the single resolver used by `useThemeTokens`; on an id
 * collision the named theme wins, so adding the family matrix cannot repaint an
 * existing theme.
 *
 * V2 — expanded visual vocabulary for a 20+ template gallery. The six original
 * ids (cream, caramel, black, teal, sage, silver) remain valid for backward
 * compatibility.
 *
 * `cream` was redesigned to read clearly distinct from `caramel` (cream is a
 * warm ivory editorial neutral with a muted olive accent; caramel stays a
 * deeper bronze skin-tone with a stronger cocoa accent and darker page bg).
 */
export const visualPalettes: PalettePreset[] = [
  {
    id: 'cream', label: 'Warm Cream', accent: '#8A7A5B', accentFg: '#FBF6EE',
    swatches: ['#3A3329', '#8A7A5B', '#C9B99C', '#F4EDE2', '#FBF8F1'],
    page: { id: 'warm-cream', label: 'Warm Cream', color: '#FBF8F1', fg: '#3A3329', muted: '#8A7A5B', surface: '#FFFFFF', line: '#E6DECE' }
  },
  {
    id: 'black', label: 'Luxury Black', accent: '#D4AF6A', accentFg: '#0B0A09',
    swatches: ['#0E0D0C', '#2B221B', '#D4AF6A', '#BFAE96', '#F4EBDD'],
    page: { id: 'luxury-black', label: 'Luxury Black', color: '#0E0D0C', fg: '#E9DCC6', muted: '#BFAE96', surface: '#161412', line: '#3A2F24' }
  },
  {
    id: 'teal', label: 'Deep Teal', accent: '#E4D2B5', accentFg: '#1F4E57',
    swatches: ['#1F4E57', '#2B6570', '#E4D2B5', '#C9DAD9', '#F7F0E6'],
    page: { id: 'deep-teal', label: 'Deep Teal', color: '#1F4E57', fg: '#F7F0E6', muted: '#C9DAD9', surface: '#2B6570', line: '#2E626C' }
  },
  {
    id: 'sage', label: 'Sage Editorial', accent: '#6B7A4E', accentFg: '#FFFFFF',
    swatches: ['#111111', '#545D50', '#6B7A4E', '#EEF2EA', '#FFFFFF'],
    page: { id: 'sage-editorial', label: 'Sage Editorial', color: '#545D50', fg: '#FFFFFF', muted: '#EEF2EA', surface: '#6B7A4E', line: '#8F9B85' }
  },
  {
    id: 'silver', label: 'Silver Minimal', accent: '#3A3D44', accentFg: '#FFFFFF',
    swatches: ['#121316', '#50545C', '#3A3D44', '#E3E5EA', '#F5F6F8'],
    page: { id: 'silver-minimal', label: 'Silver Minimal', color: '#F5F6F8', fg: '#121316', muted: '#50545C', surface: '#E3E5EA', line: '#D2D5DB' }
  },
  {
    id: 'caramel', label: 'Caramel Beauty', accent: '#B98A5A', accentFg: '#F3E3CD',
    swatches: ['#3B2618', '#6E4F3A', '#B98A5A', '#F3E6D8', '#F7EEE4'],
    page: { id: 'caramel-beauty', label: 'Caramel Beauty', color: '#6E4F3A', fg: '#F7EEE4', muted: '#F3E6D8', surface: '#B98A5A', line: '#966E53' }
  },
  {
    id: 'red-energy', label: 'Red Energy', accent: '#FFFFFF', accentFg: '#E2312F',
    swatches: ['#7A0F12', '#C02026', '#E2312F', '#F9E3E1', '#FFFFFF'],
    page: { id: 'red-energy', label: 'Red Energy', color: '#C02026', fg: '#FFFFFF', muted: '#F9E3E1', surface: '#E2312F', line: '#E2312F' }
  },
  {
    id: 'amber-sunny', label: 'Amber Sunny', accent: '#E8A012', accentFg: '#2A1A00',
    swatches: ['#3A2A00', '#9A6B00', '#E8A012', '#FFE7B3', '#FFFBEF'],
    page: { id: 'amber-sunny', label: 'Amber Sunny', color: '#FFFBEF', fg: '#3A2A00', muted: '#9A6B00', surface: '#FFE7B3', line: '#F2E3C0' }
  },
  {
    id: 'lavender-soft', label: 'Lavender Soft', accent: '#8B6CC4', accentFg: '#FFFFFF',
    swatches: ['#32243F', '#6A4B8E', '#8B6CC4', '#EFE7F8', '#FBF8FE'],
    page: { id: 'lavender-soft', label: 'Lavender Soft', color: '#FBF8FE', fg: '#32243F', muted: '#6A4B8E', surface: '#EFE7F8', line: '#E9DFF3' }
  },
  {
    id: 'purple-editorial', label: 'Purple Editorial', accent: '#C9B8EE', accentFg: '#1B1233',
    swatches: ['#1B1233', '#3C256E', '#5B3FA6', '#C9B8EE', '#F3EEFB'],
    page: { id: 'purple-editorial', label: 'Purple Editorial', color: '#1B1233', fg: '#F3EEFB', muted: '#C9B8EE', surface: '#3C256E', line: '#5B3FA6' }
  },
  {
    id: 'cyan-electric', label: 'Cyan Electric', accent: '#0EA5C4', accentFg: '#FFFFFF',
    swatches: ['#0A2A33', '#0B7A94', '#0EA5C4', '#D2F0F6', '#F5FCFD'],
    page: { id: 'cyan-electric', label: 'Cyan Electric', color: '#0A2A33', fg: '#F5FCFD', muted: '#D2F0F6', surface: '#0B7A94', line: '#14414D' }
  },
  {
    id: 'mono-editorial', label: 'Mono Editorial', accent: '#111111', accentFg: '#FFFFFF',
    swatches: ['#000000', '#222222', '#111111', '#E8E8E8', '#FFFFFF'],
    page: { id: 'mono-editorial', label: 'Mono Editorial', color: '#FFFFFF', fg: '#111111', muted: '#5A5A5A', surface: '#F4F4F4', line: '#E8E8E8' }
  },
  {
    id: 'ice-blue', label: 'Ice Blue', accent: '#3B82C4', accentFg: '#FFFFFF',
    swatches: ['#0E2A44', '#1F5A8A', '#3B82C4', '#DDEBF7', '#F7FBFE'],
    page: { id: 'ice-blue', label: 'Ice Blue', color: '#F7FBFE', fg: '#0E2A44', muted: '#3B82C4', surface: '#DDEBF7', line: '#D6E6F2' }
  },
  {
    id: 'emerald-deep', label: 'Emerald Deep', accent: '#EDF7F1', accentFg: '#0E6A52',
    swatches: ['#0A2720', '#0E4A3A', '#0E6A52', '#C7E6D8', '#F2FAF6'],
    page: { id: 'emerald-deep', label: 'Emerald Deep', color: '#0A2720', fg: '#F2FAF6', muted: '#C7E6D8', surface: '#0E4A3A', line: '#0E6A52' }
  },
  {
    id: 'terracotta', label: 'Terracotta Earth', accent: '#B8552F', accentFg: '#FBF3EB',
    swatches: ['#3A1E12', '#7A3A22', '#B8552F', '#EFC5AD', '#FBF3EB'],
    page: { id: 'terracotta', label: 'Terracotta Earth', color: '#FBF3EB', fg: '#3A1E12', muted: '#B8552F', surface: '#EFC5AD', line: '#EBCEBE' }
  },
  {
    id: 'neon-dark', label: 'Neon Dark', accent: '#22E5B2', accentFg: '#04100C',
    swatches: ['#060B12', '#0E1824', '#22E5B2', '#9BF0D8', '#16425A'],
    page: { id: 'neon-dark', label: 'Neon Dark', color: '#060B12', fg: '#D8E6F0', muted: '#8FA8BC', surface: '#0E1824', line: '#1E3246' }
  }
];

/* ------------------------------------------------------------------------- *
 * Colour families (12 × 6 = 72). Recovered from the original matrix: the same
 * hues, saturations and lightness profiles, so the generated hex values are the
 * historical ones and not a re-invention.
 * ------------------------------------------------------------------------- */

type FamilySpec = PaletteFamily & {
  pageBackgrounds: string[];
  surfaces: string[];
  secondarySurfaces: string[];
  accents: string[];
};

const variantIds = ['light', 'soft', 'medium', 'rich', 'dark', 'premium'] as const;

export const colorFamilies: FamilySpec[] = [
  {
    id: 'yellow-gold',
    label: 'Amarillo / Gold',
    variants: ['Champagne', 'Amber', 'Mustard', 'Gold', 'Bronze', 'Black Gold'],
    pageBackgrounds: ['#FFF1D6', '#FFD27A', '#D9A72E', '#C98A16', '#85530D', '#11100D'],
    surfaces: ['#FFF9EC', '#FFE8B3', '#F7D979', '#F1C45B', '#9A6418', '#211A11'],
    secondarySurfaces: ['#F6E5C4', '#EFC060', '#C98A16', '#A9690E', '#5D370D', '#2F2618'],
    accents: ['#B77A20', '#A86608', '#8E5F00', '#F2B72E', '#D89420', '#D7A646']
  },
  {
    id: 'white-premium',
    label: 'Blanco Premium',
    variants: ['Ivory', 'Pearl', 'Warm White', 'Editorial White', 'White Silver', 'White Gold'],
    pageBackgrounds: ['#FFF8E9', '#F8F4EB', '#FFF9F0', '#FFFFFF', '#EEF1F4', '#FFF7E2'],
    surfaces: ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFDF7'],
    secondarySurfaces: ['#F6EEDC', '#F0EEE8', '#F8F1E7', '#F5F5F5', '#DDE2E7', '#F4E3BB'],
    accents: ['#B8935A', '#A78B65', '#C49A6C', '#222222', '#7B8794', '#B88A2B']
  },
  {
    id: 'gray-premium',
    label: 'Gris Premium',
    variants: ['Mist', 'Silver', 'Steel', 'Graphite', 'Charcoal', 'Black Silver'],
    pageBackgrounds: ['#E9EEF2', '#D5DCE2', '#B8C2CC', '#667381', '#303A45', '#171C22'],
    surfaces: ['#F8FAFB', '#EEF2F5', '#DDE4EA', '#4A5662', '#202932', '#252D36'],
    secondarySurfaces: ['#D7E0E7', '#C4CED7', '#98A7B5', '#35414D', '#151B21', '#303A45'],
    accents: ['#6E879A', '#668093', '#526B7D', '#B8C4CF', '#D6DEE6', '#BBC8D4']
  },
  {
    id: 'red',
    label: 'Rojo',
    variants: ['Rose', 'Coral Red', 'Classic Red', 'Wine', 'Burgundy', 'Black Red'],
    pageBackgrounds: ['#F8DCE2', '#F18A83', '#D83A3A', '#76283B', '#701F32', '#1D0D12'],
    surfaces: ['#FFF3F5', '#FFD4D0', '#F5A4A0', '#A65061', '#9D344D', '#32161E'],
    secondarySurfaces: ['#F0BEC8', '#D95755', '#B9232D', '#5A1D2E', '#4B1423', '#471D29'],
    accents: ['#B83D58', '#B52D3A', '#9F1725', '#D8798D', '#E05A73', '#D55A72']
  },
  {
    id: 'green',
    label: 'Verde',
    variants: ['Sage', 'Olive', 'Emerald', 'Forest', 'Deep Green', 'Black Emerald'],
    pageBackgrounds: ['#DCE8D9', '#9BAE63', '#159447', '#176B3A', '#0E4B32', '#0D1713'],
    surfaces: ['#F1F7EE', '#D6E0AE', '#7ACB9A', '#28674A', '#28674A', '#18271F'],
    secondarySurfaces: ['#C4D6BB', '#73873A', '#087B38', '#0F4E2B', '#0A3524', '#1E3B2B'],
    accents: ['#5E7F50', '#536B24', '#0A7335', '#39A96B', '#52B77D', '#43D98D']
  },
  {
    id: 'blue',
    label: 'Azul',
    variants: ['Ice Blue', 'Sky', 'Royal Blue', 'Cobalt', 'Navy', 'Black Blue'],
    pageBackgrounds: ['#DCEFF8', '#69BCEB', '#2457D6', '#174BC2', '#102B68', '#0A111F'],
    surfaces: ['#F1FAFE', '#D4F0FF', '#4A6FD0', '#214BAF', '#27458A', '#17263F'],
    secondarySurfaces: ['#C1E2F1', '#318FCE', '#1239A8', '#103594', '#0B1E4B', '#1B345A'],
    accents: ['#4B95BF', '#1479B8', '#123DB7', '#6C8DFF', '#7FA4FF', '#4B7CFF']
  },
  {
    id: 'purple',
    label: 'Morado',
    variants: ['Lavender', 'Lilac', 'Violet', 'Purple', 'Plum', 'Black Purple'],
    pageBackgrounds: ['#EEE6FA', '#D8C4F0', '#8956C9', '#67349B', '#51204F', '#160F1F'],
    surfaces: ['#FAF7FF', '#F0E7FA', '#7445A6', '#6A3BA0', '#753D78', '#2B1835'],
    secondarySurfaces: ['#D8C8EE', '#B998D6', '#6739A4', '#4A237A', '#381439', '#422052'],
    accents: ['#8560AE', '#7949A8', '#6429A8', '#B786F1', '#D18BE8', '#B76AF5']
  },
  {
    id: 'cyan-teal',
    label: 'Turquesa / Cyan',
    variants: ['Aqua', 'Mint Cyan', 'Cyan', 'Teal', 'Deep Teal', 'Neon Dark'],
    pageBackgrounds: ['#D5F3F1', '#9CE3D8', '#0ABAC2', '#147F86', '#0D5962', '#0A1718'],
    surfaces: ['#F0FFFD', '#D8F8F1', '#73E0DC', '#0E6870', '#247A7D', '#183034'],
    secondarySurfaces: ['#B8E4DD', '#5BC7B8', '#078E97', '#0B5F68', '#0A3C44', '#1B4A4F'],
    accents: ['#2A9993', '#168F7C', '#007B86', '#51D5D1', '#4BC9C3', '#5CFFD6']
  },
  {
    id: 'earth',
    label: 'Tierra',
    variants: ['Sand', 'Clay', 'Terracotta', 'Rust', 'Chocolate', 'Dark Earth'],
    pageBackgrounds: ['#F3E3CC', '#D6A77D', '#C36E45', '#A9492B', '#5A321F', '#21130E'],
    surfaces: ['#FFF7EA', '#F0D4B6', '#E6A27D', '#8B3D23', '#875035', '#372219'],
    secondarySurfaces: ['#E6CBAA', '#B97A4F', '#9F452B', '#7B301E', '#3D2117', '#4A2A1D'],
    accents: ['#A97843', '#95562E', '#9E3D20', '#D17A4E', '#D28A50', '#B85B35']
  },
  {
    id: 'pink',
    label: 'Rosa',
    variants: ['Blush', 'Dusty Rose', 'Pink', 'Soft Fuchsia', 'Berry', 'Dark Pink'],
    pageBackgrounds: ['#F7DEE6', '#E7B8C5', '#D9437C', '#A42A86', '#762558', '#24101F'],
    surfaces: ['#FFF3F6', '#F8E2E9', '#ED8DB0', '#8D246F', '#9B4D7E', '#3D1D35'],
    secondarySurfaces: ['#EBC1CC', '#C98B9E', '#B92C65', '#812060', '#531A3D', '#55234A'],
    accents: ['#B95876', '#A9536A', '#B51F5E', '#E15AC0', '#D94C9D', '#F064C2']
  },
  {
    id: 'orange-copper',
    label: 'Naranja / Cobre',
    variants: ['Peach', 'Apricot', 'Orange', 'Copper', 'Burnt Orange', 'Black Copper'],
    pageBackgrounds: ['#FFE6D7', '#FFC29E', '#F47A2C', '#C95B20', '#A83E12', '#24130B'],
    surfaces: ['#FFF7F0', '#FFE2CB', '#FFB57E', '#F0A06A', '#A94415', '#3D2012'],
    secondarySurfaces: ['#F8C9AD', '#E89A68', '#D85018', '#A44417', '#6E250D', '#5B2C16'],
    accents: ['#C16A43', '#C4682C', '#D84A0F', '#EE9255', '#FF9B48', '#FF7738']
  },
  {
    id: 'black-premium',
    label: 'Negro Premium',
    variants: ['Black White', 'Black Gold', 'Black Silver', 'Black Red', 'Black Emerald', 'Black Neon'],
    pageBackgrounds: ['#17191C', '#0E0E0C', '#171A20', '#1C0D12', '#0B1711', '#111116'],
    surfaces: ['#25282D', '#211A10', '#252B35', '#32151E', '#14261C', '#24212D'],
    secondarySurfaces: ['#30343A', '#352713', '#303B4A', '#4D1A28', '#1C4A30', '#3C2A4C'],
    accents: ['#E5E7EB', '#D7A646', '#AAB8CA', '#D55A72', '#43D98D', '#D868FF']
  }
];

/** Reads the three 0–255 channels of a `#RRGGBB` value; anything unparsable yields `fallback`. */
function channels(color: string, fallback: [number, number, number]): [number, number, number] {
  const parts = color.match(/[A-Fa-f0-9]{2}/g)?.slice(-3) ?? [];
  const [r, g, b] = parts.map((value) => parseInt(value, 16));
  return [r ?? fallback[0], g ?? fallback[1], b ?? fallback[2]];
}

function readableOn(color: string): string {
  const [r, g, b] = channels(color, [0, 0, 0]);
  const linear = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  const whiteContrast = 1.05 / (lum + 0.05);
  const darkContrast = (lum + 0.05) / 0.05;
  return darkContrast >= whiteContrast ? '#171717' : '#FFFFFF';
}

function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = channels(a, [255, 255, 255]);
  const [br, bg, bb] = channels(b, [0, 0, 0]);
  const blend = (from: number, to: number) => Math.round(from * (1 - amount) + to * amount).toString(16).padStart(2, '0');
  return `#${blend(ar, br)}${blend(ag, bg)}${blend(ab, bb)}`.toUpperCase();
}

/** Every family is authored with six entries; a short list is a data bug, not a silent gap. */
function at<T>(values: readonly T[], index: number, what: string): T {
  const value = values[index];
  if (value === undefined) throw new Error(`Familia incompleta: ${what} no define la variante ${index}.`);
  return value;
}

/** Deterministic: same family index → same palette, every run. */
function makePalette(family: FamilySpec, index: number): PalettePreset {
  const variantId = at(variantIds, index, 'variants');
  const label = at(family.variants, index, 'variants');
  const page = at(family.pageBackgrounds, index, 'pageBackgrounds');
  const surface = at(family.surfaces, index, 'surfaces');
  const secondarySurface = at(family.secondarySurfaces, index, 'secondarySurfaces');
  const accent = at(family.accents, index, 'accents');
  const fg = readableOn(page);
  const muted = fg === '#FFFFFF' ? mix('#FFFFFF', page, 0.62) : mix('#111111', page, 0.46);
  const accentFg = readableOn(accent);
  const line = mix(page, accent, 0.5);
  const id = `${family.id}-${variantId}`;
  return {
    id,
    label,
    familyId: family.id,
    variantId,
    accent,
    accentFg,
    swatches: [page, surface, secondarySurface, accent, fg],
    page: { id, label, color: page, fg, muted, surface, line },
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
      iconForeground: accentFg
    }
  };
}

export const familyPalettes: PalettePreset[] = colorFamilies.flatMap((family) => family.variants.map((_, index) => makePalette(family, index)));

/** Every selectable palette in the editor: the 16 named themes and the 72 family variants. */
export const allPalettes: PalettePreset[] = [...visualPalettes, ...familyPalettes];

export const familyPalettesByFamily = Object.fromEntries(colorFamilies.map((family) => [family.id, familyPalettes.filter((palette) => palette.familyId === family.id)]));

/**
 * Resolver for a stored `page.palette` value. The named themes are spread last
 * so their ids and exact colours win any collision, and the aliases below only
 * fill ids that are not already a real palette — an alias must never repaint an
 * id that a saved page already resolves to.
 */
export const visualPaletteById: Record<string, PalettePreset> = {
  ...Object.fromEntries(familyPalettes.map((palette) => [palette.id, palette])),
  ...Object.fromEntries(visualPalettes.map((palette) => [palette.id, palette]))
};

/** Historical ids → canonical palette. Tone-id aliases (`silver-minimal`…) keep resolving. */
export const legacyPaletteMap: Record<string, string> = {
  cream: 'white-premium-light',
  black: 'black-premium-rich',
  teal: 'cyan-teal-rich',
  sage: 'green-light',
  silver: 'gray-premium-soft',
  caramel: 'earth-rich',
  'warm-cream': 'white-premium-light',
  'luxury-black': 'black-premium-rich',
  'deep-teal': 'cyan-teal-rich',
  'sage-editorial': 'green-light',
  'silver-minimal': 'gray-premium-soft',
  'caramel-beauty': 'earth-rich',
  'red-energy': 'red-medium',
  'amber-sunny': 'yellow-gold-soft',
  'lavender-soft': 'purple-light',
  'purple-editorial': 'purple-rich',
  'cyan-electric': 'cyan-teal-medium',
  'mono-editorial': 'gray-premium-rich',
  'ice-blue': 'blue-light',
  'emerald-deep': 'green-medium',
  terracotta: 'earth-medium',
  'neon-dark': 'cyan-teal-premium'
};

for (const [legacyId, canonicalId] of Object.entries(legacyPaletteMap)) {
  const canonical = visualPaletteById[canonicalId];
  if (canonical && !visualPaletteById[legacyId]) visualPaletteById[legacyId] = { ...canonical, id: legacyId };
}

/** Card-scoped tokens for every named visual direction. */
export const cardPaletteTokens: Record<string, CardPaletteValues> = {
  cream: {
    cardBg: '#FFFFFF', cardSurface: '#F4EDE2', cardText: '#3A3329', cardMuted: '#8A7A5B',
    cardLine: '#E6DECE', cardAccent: '#8A7A5B', cardAccentFg: '#FBF6EE', cardIconBg: '#F4EDE2', cardIconColor: '#6D5F45'
  },
  black: {
    cardBg: '#161412', cardSurface: '#1F1A15', cardText: '#F4EBDD', cardMuted: '#BFAE96',
    cardLine: '#3A2F24', cardAccent: '#D4AF6A', cardAccentFg: '#0B0A09', cardIconBg: '#1F1A15', cardIconColor: '#D4AF6A'
  },
  teal: {
    cardBg: '#2B6570', cardSurface: '#F7F0E6', cardText: '#1F4E57', cardMuted: '#5B777A',
    cardLine: '#2E626C', cardAccent: '#E4D2B5', cardAccentFg: '#1F4E57', cardIconBg: '#F7F0E6', cardIconColor: '#1F4E57'
  },
  sage: {
    cardBg: '#FFFFFF', cardSurface: '#EEF2EA', cardText: '#111111', cardMuted: '#545D50',
    cardLine: '#E3E8DF', cardAccent: '#6B7A4E', cardAccentFg: '#FFFFFF', cardIconBg: '#EEF2EA', cardIconColor: '#3F4A2E'
  },
  silver: {
    cardBg: '#F5F6F8', cardSurface: '#E3E5EA', cardText: '#121316', cardMuted: '#50545C',
    cardLine: '#D2D5DB', cardAccent: '#3A3D44', cardAccentFg: '#FFFFFF', cardIconBg: '#2A2C31', cardIconColor: '#FFFFFF'
  },
  caramel: {
    cardBg: '#F7EEE4', cardSurface: '#F3E6D8', cardText: '#3B2618', cardMuted: '#6E4F3A',
    cardLine: '#E4D2BF', cardAccent: '#B98A5A', cardAccentFg: '#F3E3CD', cardIconBg: '#F3E6D8', cardIconColor: '#7E5332'
  },
  'red-energy': {
    cardBg: '#FFFFFF', cardSurface: '#F9E3E1', cardText: '#3A1214', cardMuted: '#8A3B3C',
    cardLine: '#F0D4D1', cardAccent: '#E2312F', cardAccentFg: '#FFFFFF', cardIconBg: '#F9E3E1', cardIconColor: '#C02026'
  },
  'amber-sunny': {
    cardBg: '#FFFFFF', cardSurface: '#FFE7B3', cardText: '#3A2A00', cardMuted: '#8A6410',
    cardLine: '#F2E3C0', cardAccent: '#E8A012', cardAccentFg: '#2A1A00', cardIconBg: '#FFE7B3', cardIconColor: '#9A6B00'
  },
  'lavender-soft': {
    cardBg: '#FFFFFF', cardSurface: '#EFE7F8', cardText: '#32243F', cardMuted: '#6A4B8E',
    cardLine: '#E9DFF3', cardAccent: '#8B6CC4', cardAccentFg: '#FFFFFF', cardIconBg: '#EFE7F8', cardIconColor: '#6A4B8E'
  },
  'purple-editorial': {
    cardBg: '#FFFFFF', cardSurface: '#C9B8EE', cardText: '#1B1233', cardMuted: '#5B4A7A',
    cardLine: '#DDD1F0', cardAccent: '#5B3FA6', cardAccentFg: '#F4EFFC', cardIconBg: '#C9B8EE', cardIconColor: '#3C256E'
  },
  'cyan-electric': {
    cardBg: '#FFFFFF', cardSurface: '#D2F0F6', cardText: '#0A2A33', cardMuted: '#0B6A80',
    cardLine: '#CBEAF1', cardAccent: '#0EA5C4', cardAccentFg: '#FFFFFF', cardIconBg: '#D2F0F6', cardIconColor: '#0B7A94'
  },
  'mono-editorial': {
    cardBg: '#FFFFFF', cardSurface: '#F4F4F4', cardText: '#111111', cardMuted: '#5A5A5A',
    cardLine: '#101010', cardAccent: '#111111', cardAccentFg: '#FFFFFF', cardIconBg: '#F4F4F4', cardIconColor: '#111111'
  },
  'ice-blue': {
    cardBg: '#FFFFFF', cardSurface: '#DDEBF7', cardText: '#0E2A44', cardMuted: '#3A6B96',
    cardLine: '#D6E6F2', cardAccent: '#3B82C4', cardAccentFg: '#FFFFFF', cardIconBg: '#DDEBF7', cardIconColor: '#1F5A8A'
  },
  'emerald-deep': {
    cardBg: '#FFFFFF', cardSurface: '#C7E6D8', cardText: '#0A2720', cardMuted: '#2E6B58',
    cardLine: '#D4E9DF', cardAccent: '#0E6A52', cardAccentFg: '#EDF7F1', cardIconBg: '#C7E6D8', cardIconColor: '#0E4A3A'
  },
  terracotta: {
    cardBg: '#FFFFFF', cardSurface: '#EFC5AD', cardText: '#3A1E12', cardMuted: '#8A4A30',
    cardLine: '#EBCEBE', cardAccent: '#B8552F', cardAccentFg: '#FBF3EB', cardIconBg: '#EFC5AD', cardIconColor: '#7A3A22'
  },
  'neon-dark': {
    cardBg: '#0E1824', cardSurface: '#121E2E', cardText: '#D8E6F0', cardMuted: '#8FA8BC',
    cardLine: '#1E3246', cardAccent: '#22E5B2', cardAccentFg: '#04100C', cardIconBg: '#121E2E', cardIconColor: '#22E5B2'
  }
};
