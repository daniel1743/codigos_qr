import { getBlockStyle, type PageBlock, type PageConfig } from "./editorCandidateModel";

export type PaletteCategory = "Lujo y elegancia" | "Editorial y minimalista" | "Elegante y sofisticada" | "Moderna y creativa" | "Natural y premium";
export type PaletteScope = "backgrounds" | "surfaces" | "typography" | "headings" | "accents" | "buttons" | "buttonText" | "borders" | "outlines" | "icons" | "shadows" | "decorations" | "gradients";
export type PaletteMode = "complete" | "smart" | "backgrounds" | "typography" | "accents" | "borders" | "choose";
export type PremiumPalette = { id: string; name: string; category: PaletteCategory; description: string; colors: { backgroundPrimary: string; backgroundSecondary: string; surface: string; textPrimary: string; textSecondary: string; heading: string; accentPrimary: string; accentSecondary: string; border: string; outline: string; buttonPrimary: string; buttonPrimaryText: string; shadow: string; gradientStart: string; gradientEnd: string } };
export type PaletteContrast = { textOnBackground: number; buttonTextOnButton: number; textPass: boolean; buttonPass: boolean };

export const PALETTE_SCOPE_LABELS: Record<PaletteScope, string> = { backgrounds: "Fondos principales", surfaces: "Tarjetas y superficies", typography: "Texto principal y secundario", headings: "Títulos", accents: "Acentos", buttons: "Botones", buttonText: "Texto de botones", borders: "Bordes", outlines: "Contornos", icons: "Iconos", shadows: "Sombras", decorations: "Elementos decorativos", gradients: "Gradientes" };
export const ALL_PALETTE_SCOPES: PaletteScope[] = ["backgrounds", "surfaces", "typography", "headings", "accents", "buttons", "buttonText", "borders", "outlines", "icons", "shadows", "decorations", "gradients"];

type PaletteSeed = [string, string, PaletteCategory, string, string, string, string, string, string, string, string, string, string, string, string];
const seeds: PaletteSeed[] = [
  ["imperial_gold", "Oro Imperial", "Lujo y elegancia", "#0B0B0C", "#171719", "#232326", "#F5F0E6", "#C9C0AE", "#D4AF37", "#F0D77A", "#7A6422", "#D4AF37", "#D4AF37", "#111111", "rgba(0,0,0,0.42)"],
  ["champagne_noir", "Champagne Noir", "Lujo y elegancia", "#171513", "#25211E", "#302B26", "#F3EBDD", "#CFC1AD", "#C8A978", "#E6D2AE", "#705F4A", "#C8A978", "#C8A978", "#1A1714", "rgba(0,0,0,0.38)"],
  ["platinum", "Platino", "Lujo y elegancia", "#15171A", "#24272B", "#30343A", "#F3F5F6", "#B8BEC5", "#C7CCD1", "#8FA2B4", "#5B646E", "#C7CCD1", "#C7CCD1", "#17191B", "rgba(0,0,0,0.4)"],
  ["royal_bronze", "Bronce Real", "Lujo y elegancia", "#211713", "#33231C", "#463128", "#F3E7D6", "#CDBAA3", "#B87333", "#D89B62", "#795033", "#B87333", "#B87333", "#1D140F", "rgba(0,0,0,0.42)"],
  ["imperial_emerald", "Esmeralda Imperial", "Lujo y elegancia", "#082B25", "#103B33", "#174A40", "#F3F0E7", "#C2D1C7", "#C6A04A", "#E3C878", "#3C6D5C", "#C6A04A", "#C6A04A", "#11251F", "rgba(0,0,0,0.42)"],
  ["sapphire_gold", "Zafiro Dorado", "Lujo y elegancia", "#08162D", "#102445", "#173257", "#F3F5F7", "#BFC9D8", "#D3AF4D", "#F0D980", "#34527A", "#D3AF4D", "#D3AF4D", "#101B2D", "rgba(0,0,0,0.45)"],
  ["editorial_noir", "Editorial Noir", "Editorial y minimalista", "#111111", "#1C1C1C", "#292929", "#F4F1EA", "#B8B4AC", "#E8E1D5", "#8B8175", "#4B4843", "#E8E1D5", "#F0EBE1", "#171717", "rgba(0,0,0,0.45)"],
  ["ivory_studio", "Ivory Studio", "Editorial y minimalista", "#F4EFE6", "#E8E0D3", "#FFFFFF", "#292622", "#716B62", "#8B7761", "#C3AF97", "#C9BFAF", "#8B7761", "#292622", "#F7F1E7", "rgba(40,35,30,0.16)"],
  ["stone_ink", "Stone & Ink", "Editorial y minimalista", "#D8D3CA", "#C3BDB2", "#ECE8E1", "#252728", "#626563", "#4B5150", "#85847D", "#A7A298", "#4B5150", "#353A39", "#F3F1EC", "rgba(25,27,27,0.18)"],
  ["nordic_slate", "Nordic Slate", "Editorial y minimalista", "#DCE1E4", "#C8D0D5", "#F2F4F5", "#25313A", "#63717A", "#50697A", "#91A4B0", "#B0BBC1", "#50697A", "#50697A", "#F4F6F7", "rgba(37,49,58,0.16)"],
  ["mocha_editorial", "Mocha Editorial", "Editorial y minimalista", "#2B211D", "#45352E", "#5A463C", "#F1E7D8", "#C8B9A6", "#A77B5A", "#D0AE8C", "#795D4A", "#A77B5A", "#A77B5A", "#231A16", "rgba(0,0,0,0.4)"],
  ["sage_minimal", "Sage Minimal", "Editorial y minimalista", "#E8E7DF", "#D8D8CD", "#F5F4EF", "#2F3732", "#6F7770", "#7D927F", "#B7C2B2", "#BEC4B9", "#7D927F", "#657968", "#FFFFFF", "rgba(47,55,50,0.14)"],
  ["rose_champagne", "Rose Champagne", "Elegante y sofisticada", "#F1E4E1", "#E3D0CC", "#FFF9F7", "#403735", "#796B68", "#B98183", "#D4B49D", "#D8BDB9", "#B98183", "#B98183", "#2A0E18", "rgba(80,55,55,0.14)"],
  ["bordeaux_luxe", "Bordeaux Luxe", "Elegante y sofisticada", "#2A0E18", "#421626", "#5A2033", "#F4E9E5", "#D2B8B8", "#B36A75", "#D7B47D", "#7B3A4B", "#B36A75", "#B36A75", "#16070E", "rgba(0,0,0,0.42)"],
  ["blush_cocoa", "Blush & Cocoa", "Elegante y sofisticada", "#F0DDD7", "#E4C8C0", "#FFF8F4", "#49352F", "#806B63", "#9A6657", "#D8A99C", "#D4B6AD", "#9A6657", "#6E473D", "#FFF7F2", "rgba(73,53,47,0.14)"],
  ["dusty_mauve", "Dusty Mauve", "Elegante y sofisticada", "#E7DEE2", "#D5C4CB", "#F7F3F5", "#3D3138", "#75636D", "#8D6677", "#B79AAA", "#C7B4BD", "#8D6677", "#6F4E5E", "#FAF6F8", "rgba(61,49,56,0.14)"],
  ["midnight_neon", "Midnight Neon", "Moderna y creativa", "#090D17", "#111827", "#182235", "#F1F7FA", "#A9B5C3", "#30C8D8", "#75E7F0", "#285B68", "#30C8D8", "#30C8D8", "#081016", "rgba(0,0,0,0.5)"],
  ["electric_violet", "Electric Violet", "Moderna y creativa", "#17102B", "#251B42", "#34265B", "#F4F1FB", "#C5BADA", "#9B6CFF", "#C4A9FF", "#63489D", "#9B6CFF", "#9B6CFF", "#17102B", "rgba(0,0,0,0.48)"],
  ["ocean_glass", "Ocean Glass", "Moderna y creativa", "#092A33", "#10414C", "#16545F", "#EEF7F5", "#B7D0CD", "#3CA9A5", "#82D0CA", "#317078", "#3CA9A5", "#3CA9A5", "#09272E", "rgba(0,0,0,0.4)"],
  ["terracotta_modern", "Terracotta Modern", "Moderna y creativa", "#F0E1D4", "#E2C8B6", "#FFF7F1", "#392B26", "#776159", "#B96045", "#D99372", "#D0AD98", "#B96045", "#A84E37", "#FFF7F1", "rgba(57,43,38,0.16)"],
  ["olive_gold", "Olive & Gold", "Natural y premium", "#31352A", "#464B3B", "#595F4C", "#F0EBDD", "#C8C6B2", "#B79A55", "#D7C27F", "#74795F", "#B79A55", "#B79A55", "#25291F", "rgba(0,0,0,0.4)"],
  ["forest_luxe", "Forest Luxe", "Natural y premium", "#0D261C", "#173629", "#214737", "#EEF0E6", "#BBC9BE", "#A57B4A", "#D0A56B", "#3B6651", "#A57B4A", "#B58D5A", "#102319", "rgba(0,0,0,0.45)"],
  ["desert_sand", "Desert Sand", "Natural y premium", "#E8D6BE", "#D7BE9C", "#F7EBDD", "#3A2A20", "#75604E", "#A66B42", "#C99B6B", "#C8A982", "#A66B42", "#6E432B", "#FFF7EB", "rgba(58,42,32,0.16)"],
  ["coastal_blue", "Coastal Blue", "Natural y premium", "#DCE7E7", "#C2D5D7", "#F5F8F7", "#263943", "#63757B", "#3F7380", "#83AEB4", "#A7C1C4", "#3F7380", "#3F7380", "#F4F8F8", "rgba(38,57,67,0.14)"],
];

export const premiumPalettes: PremiumPalette[] = seeds.map(([id, name, category, backgroundPrimary, backgroundSecondary, surface, textPrimary, textSecondary, accentPrimary, accentSecondary, border, outline, buttonPrimary, buttonPrimaryText, shadow]) => ({ id, name, category, description: `${name}: sistema cromático premium con roles semánticos.`, colors: { backgroundPrimary, backgroundSecondary, surface, textPrimary, textSecondary, heading: textPrimary, accentPrimary, accentSecondary, border, outline, buttonPrimary, buttonPrimaryText, shadow, gradientStart: backgroundSecondary, gradientEnd: backgroundPrimary } }));

export function getPremiumPalette(id?: string) { return premiumPalettes.find(palette => palette.id === id); }
export function scopesForPaletteMode(mode: PaletteMode): PaletteScope[] { if (mode === "complete" || mode === "smart") return ALL_PALETTE_SCOPES; if (mode === "backgrounds") return ["backgrounds", "surfaces", "gradients"]; if (mode === "typography") return ["typography", "headings", "buttonText"]; if (mode === "accents") return ["accents", "buttons", "icons", "decorations"]; if (mode === "borders") return ["borders", "outlines"]; return []; }

function hexToRgb(hex: string) { const value = hex.replace("#", ""); if (!/^[0-9a-f]{6}$/i.test(value)) return null; const numeric = Number.parseInt(value, 16); return [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255] as const; }
function luminance(hex: string) { const rgb = hexToRgb(hex); if (!rgb) return 1; const channel = (value: number) => { const normalized = value / 255; return normalized <= .03928 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4; }; return .2126 * channel(rgb[0]) + .7152 * channel(rgb[1]) + .0722 * channel(rgb[2]); }
export function contrastRatio(foreground: string, background: string) { const first = luminance(foreground); const second = luminance(background); return (Math.max(first, second) + .05) / (Math.min(first, second) + .05); }
export function paletteContrast(palette: PremiumPalette): PaletteContrast { const textOnBackground = contrastRatio(palette.colors.textPrimary, palette.colors.backgroundPrimary); const buttonTextOnButton = contrastRatio(palette.colors.buttonPrimaryText, palette.colors.buttonPrimary); return { textOnBackground, buttonTextOnButton, textPass: textOnBackground >= 4.5, buttonPass: buttonTextOnButton >= 4.5 }; }

function patchStyle(block: PageBlock, palette: PremiumPalette, scopes: ReadonlySet<PaletteScope>): PageBlock {
  const style = getBlockStyle(block); const border = scopes.has("borders") ? { ...style.border, color: palette.colors.border, style: style.border.width > 0 ? style.border.style === "none" ? "solid" : style.border.style : style.border.style } : style.border; const shadow = scopes.has("shadows") ? { ...style.shadow, color: palette.colors.shadow } : style.shadow; const gradient = scopes.has("gradients") ? { ...style.gradient, start: palette.colors.gradientStart, middle: palette.colors.accentSecondary, end: palette.colors.gradientEnd } : style.gradient;
  return { ...block, props: { ...block.props, style: { ...style, border, shadow, gradient } } };
}

export function applyPremiumPalette<T extends PageConfig>(config: T, paletteId: string, selectedScopes: PaletteScope[]): T {
  const palette = getPremiumPalette(paletteId); if (!palette) return config; const scopes = new Set(selectedScopes); const colors = palette.colors;
  const theme = { ...config.theme, ...(scopes.has("headings") ? { titleColor: colors.heading } : {}), ...(scopes.has("buttons") ? { buttonColor: colors.buttonPrimary } : {}) };
  const background = { ...config.background, ...(scopes.has("backgrounds") ? { base: colors.backgroundPrimary, gradientEnd: colors.backgroundSecondary } : {}), ...(scopes.has("gradients") ? { gradientEnd: colors.gradientEnd } : {}) };
  const blocks = config.blocks.map(source => {
    let block = patchStyle(source, palette, scopes); const props = { ...block.props };
    if (block.type === "heading" && scopes.has("headings")) Object.assign(props, { color: colors.heading, textStrokeColor: scopes.has("outlines") ? colors.outline : props["textStrokeColor"], shadowColor: scopes.has("shadows") ? colors.shadow : props["shadowColor"] });
    if (block.type === "text" && scopes.has("typography")) Object.assign(props, { color: colors.textSecondary, textStrokeColor: scopes.has("outlines") ? colors.outline : props["textStrokeColor"], shadowColor: scopes.has("shadows") ? colors.shadow : props["shadowColor"] });
    if (block.type === "links") { const items = (props["items"] as Array<{ style?: Record<string, unknown> }> | undefined) ?? []; props["items"] = items.map(item => ({ ...item, style: { ...item.style, ...(scopes.has("buttons") ? { color: colors.buttonPrimary } : {}), ...(scopes.has("buttonText") ? { textColor: colors.buttonPrimaryText } : {}), ...(scopes.has("borders") ? { borderColor: colors.border } : {}) } })); }
    if (block.type === "cards") { const items = (props["items"] as Array<Record<string, unknown>> | undefined) ?? []; props["items"] = items.map(item => { const titleStyle = (item["titleStyle"] as Record<string, unknown> | undefined) ?? {}; const descriptionStyle = (item["descriptionStyle"] as Record<string, unknown> | undefined) ?? {}; const ctaStyle = (item["ctaStyle"] as Record<string, unknown> | undefined) ?? {}; return { ...item, ...(scopes.has("surfaces") ? { background: colors.surface } : {}), ...(scopes.has("borders") ? { borderColor: colors.border } : {}), titleStyle: { ...titleStyle, ...(scopes.has("headings") ? { color: colors.heading } : {}), ...(scopes.has("outlines") ? { textStrokeColor: colors.outline } : {}) }, descriptionStyle: { ...descriptionStyle, ...(scopes.has("typography") ? { color: colors.textSecondary } : {}), ...(scopes.has("outlines") ? { textStrokeColor: colors.outline } : {}) }, ctaStyle: { ...ctaStyle, ...(scopes.has("buttonText") ? { color: colors.buttonPrimaryText } : {}), ...(scopes.has("outlines") ? { textStrokeColor: colors.outline } : {}) } }; }); }
    if (block.type === "socials" && (scopes.has("icons") || scopes.has("accents"))) props["color"] = colors.accentPrimary;
    if (block.type === "footer" && scopes.has("typography")) props["color"] = colors.textSecondary;
    if (["cards", "services", "products", "booking", "faq", "contact", "map", "video"].includes(block.type) && scopes.has("surfaces")) Object.assign(props, { background: colors.surface, color: colors.textPrimary });
    if (["shape", "ring", "ornament", "frame", "particles", "separator"].includes(block.type) && (scopes.has("decorations") || scopes.has("accents"))) props["color"] = colors.accentPrimary;
    return { ...block, props };
  });
  return { ...config, theme, background, blocks, palette: { selectedId: palette.id, appliedScopes: [...scopes] } } as T;
}
