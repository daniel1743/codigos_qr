import type { IndustryId } from "./industries";
import type { ThemeAppearance, ThemeId } from "./registries";
import { SeededRandom, deriveSeed } from "./seed";

export type PaletteTone =
  | "luxury"
  | "clinical"
  | "executive"
  | "warm"
  | "bold"
  | "editorial"
  | "athletic"
  | "entertainment";

export type PaletteTier = "premium" | "premium_pro";
export type PaletteMode = "light" | "dark" | "balanced";
export type ContrastProfile = "standard" | "high" | "soft";

export interface SemanticPaletteTokens {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentSoft: string;
  border: string;
}

export interface TemplatePalette {
  id: string;
  name: string;
  industries: readonly (IndustryId | "veterinary" | "beauty" | "creator" | "real_estate" | "fitness" | "entertainment_and_betting_visual")[];
  tone: PaletteTone;
  tier: PaletteTier;
  mode: PaletteMode;
  contrastProfile: ContrastProfile;
  preferredThemeId: ThemeId;
  tokens: SemanticPaletteTokens;
}

const family = <T extends readonly TemplatePalette[]>(palettes: T) => palettes;

export const TEMPLATE_PALETTES = family([
  p("obsidian-gold", "Obsidian Gold", ["legal", "restaurant", "barber"], "luxury", "premium_pro", "dark", "high", "black-gold", ["#030303", "#14110A", "#FFFFFF", "#D4AF37", "#D4AF37", "#F0D98A", "#D4AF37"]),
  p("platinum-graphite", "Platinum Graphite", ["legal", "real_estate", "barber"], "luxury", "premium", "balanced", "high", "black-silver", ["#161616", "#2B2B2B", "#FFFFFF", "#C9CDD1", "#D7DADF", "#F1F3F5", "#8A8F95"]),
  p("rose-platinum", "Rose Platinum", ["beauty", "medical"], "luxury", "premium_pro", "light", "standard", "rose-gold", ["#FFF7F4", "#FFFFFF", "#3D3032", "#A86672", "#B76E79", "#F2C8D0", "#C996A0"]),
  p("silver-frost", "Silver Frost", ["medical", "beauty", "real_estate"], "luxury", "premium", "light", "standard", "platinum", ["#F7F8FA", "#FFFFFF", "#20242A", "#626A73", "#7F8791", "#E7EAEE", "#C8CDD3"]),
  p("champagne-noir", "Champagne Noir", ["restaurant", "beauty", "legal"], "luxury", "premium_pro", "dark", "high", "black-gold", ["#070605", "#17130F", "#FFFFFF", "#E8D6AC", "#D7B56D", "#F2E1B7", "#B9944D"]),
  p("ivory-bronze", "Ivory Bronze", ["restaurant", "real_estate", "legal"], "luxury", "premium", "light", "standard", "ivory-gold", ["#FFFDF4", "#FFFFFF", "#2C261F", "#745B3B", "#B07A3A", "#E8C999", "#C69B68"]),

  p("clinical-trust", "Clinical Trust", ["medical"], "clinical", "premium", "light", "high", "premium-white", ["#F7FBFF", "#FFFFFF", "#112233", "#496578", "#2D8AC8", "#D8EEF9", "#B8D6E8"]),
  p("executive-medical", "Executive Medical", ["medical"], "executive", "premium_pro", "dark", "high", "executive-blue", ["#061B33", "#0E2B4D", "#FFFFFF", "#9ED8F2", "#56B6D9", "#BCEBFA", "#2F80A8"]),
  p("calm-teal", "Calm Teal", ["medical", "veterinary"], "clinical", "premium", "balanced", "standard", "emerald-luxury", ["#EAF7F5", "#FFFFFF", "#173331", "#4D7470", "#1C8E85", "#C8ECE8", "#8FCFC8"]),
  p("luxury-clinic", "Luxury Clinic", ["medical", "beauty"], "luxury", "premium_pro", "dark", "high", "emerald-luxury", ["#052E2E", "#0B4442", "#FFFFFF", "#DFD19A", "#D4AF37", "#EFE1A9", "#C8A441"]),
  p("warm-wellness", "Warm Wellness", ["medical", "beauty"], "warm", "premium", "light", "standard", "rose-gold", ["#FFF8F0", "#FFFFFF", "#362B25", "#7C6254", "#C47A5A", "#F2D4C4", "#D9A78E"]),

  p("legal-heritage", "Legal Heritage", ["legal"], "executive", "premium", "dark", "high", "burgundy-elegant", ["#2B0709", "#4A1014", "#FFFFFF", "#E5B382", "#C99A5B", "#EED1A4", "#B67E3F"]),
  p("executive-navy", "Executive Navy", ["legal", "real_estate"], "executive", "premium", "dark", "high", "executive-blue", ["#071C38", "#102D52", "#FFFFFF", "#9FC9E6", "#6CA8D7", "#C9E3F4", "#3D78AA"]),
  p("burgundy-brass", "Burgundy Brass", ["legal", "restaurant"], "luxury", "premium_pro", "dark", "high", "burgundy-elegant", ["#36050A", "#5A1118", "#FFFFFF", "#E2B67E", "#B9823A", "#EBCB9B", "#A66F31"]),
  p("graphite-counsel", "Graphite Counsel", ["legal"], "executive", "premium", "dark", "standard", "graphite", ["#232323", "#363636", "#FFFFFF", "#B6B6B6", "#D8D8D8", "#EFEFEF", "#5F5F5F"]),
  p("ivory-executive", "Ivory Executive", ["legal", "real_estate"], "executive", "premium", "light", "standard", "ivory-gold", ["#FFFDF2", "#FFFFFF", "#242424", "#605642", "#BFA15A", "#EFE2B8", "#D1BE85"]),

  p("emerald-care", "Emerald Care", ["veterinary", "medical"], "clinical", "premium", "balanced", "standard", "emerald-luxury", ["#EAF8EF", "#FFFFFF", "#173522", "#557260", "#278B4F", "#CFEED8", "#91CBA5"]),
  p("calm-veterinary", "Calm Veterinary", ["veterinary"], "clinical", "premium", "light", "standard", "premium-white", ["#F3FAF8", "#FFFFFF", "#1C332F", "#5B746F", "#2E9D8F", "#D1F0EB", "#A4D8D0"]),
  p("forest-cream", "Forest Cream", ["veterinary", "restaurant"], "warm", "premium", "light", "standard", "ivory-gold", ["#FBF7E9", "#FFFFFF", "#263226", "#657057", "#6F8C3D", "#DDE8BF", "#A7B77A"]),
  p("modern-teal", "Modern Teal", ["veterinary", "medical", "fitness"], "clinical", "premium", "dark", "high", "emerald-luxury", ["#063234", "#0D4B4D", "#FFFFFF", "#9AD6D3", "#23B6AD", "#BDEDE9", "#268D88"]),

  p("hospitality-terracotta", "Hospitality Terracotta", ["restaurant"], "warm", "premium", "light", "standard", "ivory-gold", ["#FFF4EA", "#FFFFFF", "#3A241C", "#7A594A", "#C96B3C", "#F1C8AD", "#D58E68"]),
  p("gourmet-noir", "Gourmet Noir", ["restaurant"], "luxury", "premium_pro", "dark", "high", "black-gold", ["#070707", "#181512", "#FFFFFF", "#E6CAA0", "#D49A43", "#EFC88A", "#B5792F"]),
  p("mediterranean", "Mediterranean", ["restaurant"], "warm", "premium", "balanced", "standard", "executive-blue", ["#F7F3E8", "#FFFFFF", "#24313A", "#617782", "#1D7E96", "#C8E6EA", "#8ABDC6"]),
  p("coffee-heritage", "Coffee Heritage", ["restaurant"], "warm", "premium", "dark", "high", "burgundy-elegant", ["#21150F", "#382419", "#FFF6EA", "#D8B792", "#B8793E", "#E2C09C", "#9A6335"]),
  p("modern-bistro", "Modern Bistro", ["restaurant"], "executive", "premium", "dark", "standard", "graphite", ["#202020", "#303030", "#FFFFFF", "#C9C9C9", "#E0E0E0", "#F4F4F4", "#626262"]),

  p("barber-heritage", "Barber Heritage", ["barber"], "bold", "premium", "dark", "high", "black-gold", ["#0A0806", "#19130E", "#FFFFFF", "#D2B184", "#C7924B", "#E4C596", "#9E713A"]),
  p("black-gold", "Black Gold", ["barber", "restaurant"], "luxury", "premium_pro", "dark", "high", "black-gold", ["#000000", "#141414", "#FFFFFF", "#D4AF37", "#D4AF37", "#E9CD74", "#B9972F"]),
  p("urban-steel", "Urban Steel", ["barber", "fitness"], "bold", "premium", "dark", "standard", "black-silver", ["#111315", "#252A2E", "#FFFFFF", "#BBC3CB", "#9EA8B2", "#D7DCE1", "#59636D"]),
  p("classic-bronze", "Classic Bronze", ["barber"], "warm", "premium", "dark", "high", "burgundy-elegant", ["#1E120C", "#322018", "#FFFFFF", "#C8A078", "#B6783C", "#D8B58A", "#8E5D33"]),

  p("beauty-champagne", "Beauty Champagne", ["beauty"], "luxury", "premium", "light", "standard", "rose-gold", ["#FFF8F4", "#FFFFFF", "#3D3030", "#8C6B68", "#C69C6D", "#F1D6B8", "#D6B38F"]),
  p("soft-luxury", "Soft Luxury", ["beauty"], "luxury", "premium", "light", "soft", "platinum", ["#FAF8F7", "#FFFFFF", "#322E2D", "#7E7470", "#A58C7E", "#E8DDD7", "#CBBAB0"]),
  p("modern-nude", "Modern Nude", ["beauty"], "warm", "premium", "light", "standard", "premium-white", ["#F8F0EB", "#FFFFFF", "#2F2724", "#796760", "#B98B78", "#EAD1C5", "#D0AA9A"]),
  p("midnight-beauty", "Midnight Beauty", ["beauty", "creator"], "luxury", "premium_pro", "dark", "high", "graphite", ["#101014", "#202027", "#FFFFFF", "#D9C6D8", "#C48CBF", "#E3C5E0", "#9E6C9A"]),

  p("editorial-creator", "Editorial Creator", ["creator"], "editorial", "premium", "light", "standard", "premium-white", ["#FAFAF8", "#FFFFFF", "#191919", "#5E5E5E", "#111111", "#E8E8E8", "#D2D2D2"]),
  p("midnight-magenta", "Midnight Magenta", ["creator", "beauty"], "editorial", "premium_pro", "dark", "high", "graphite", ["#0D0B12", "#1B1524", "#FFFFFF", "#E7B6DE", "#D63DBB", "#F0AEE6", "#9B357F"]),
  p("minimal-monochrome", "Minimal Monochrome", ["creator", "legal"], "editorial", "premium", "light", "high", "premium-white", ["#FFFFFF", "#F7F7F7", "#111111", "#545454", "#000000", "#E0E0E0", "#BDBDBD"]),
  p("electric-creator", "Electric Creator", ["creator", "entertainment_and_betting_visual"], "editorial", "premium_pro", "dark", "high", "executive-blue", ["#050B1A", "#101A33", "#FFFFFF", "#A9C8FF", "#37A2FF", "#BBD8FF", "#2B6CB0"]),
  p("warm-editorial", "Warm Editorial", ["creator", "restaurant"], "editorial", "premium", "light", "standard", "ivory-gold", ["#FFF8EF", "#FFFFFF", "#2E2923", "#6B6257", "#B77945", "#E8C7A3", "#C79A70"]),

  p("real-estate-executive", "Real Estate Executive", ["real_estate"], "executive", "premium", "dark", "high", "executive-blue", ["#081B2D", "#132D45", "#FFFFFF", "#B6D0E4", "#8BB8D8", "#D4E7F5", "#4A83AB"]),
  p("stone-luxury", "Stone Luxury", ["real_estate"], "luxury", "premium", "balanced", "standard", "platinum", ["#E9E6DE", "#F8F7F4", "#24211C", "#6B665E", "#8D8170", "#DDD5C8", "#B8AEA0"]),
  p("navy-champagne", "Navy Champagne", ["real_estate", "legal"], "luxury", "premium_pro", "dark", "high", "executive-blue", ["#061B32", "#102B48", "#FFFFFF", "#E6D1A3", "#D6AE64", "#ECD9AD", "#AF8543"]),
  p("modern-architectural", "Modern Architectural", ["real_estate"], "executive", "premium", "light", "standard", "premium-white", ["#F4F5F5", "#FFFFFF", "#1E2326", "#626A6F", "#4D5B63", "#D9DEE1", "#AAB3B8"]),

  p("fitness-carbon", "Fitness Carbon", ["fitness"], "athletic", "premium", "dark", "high", "graphite", ["#0B0D0F", "#1B2025", "#FFFFFF", "#B9C2CC", "#A7B0BA", "#D7DDE3", "#505A64"]),
  p("performance-blue", "Performance Blue", ["fitness"], "athletic", "premium", "dark", "high", "executive-blue", ["#06152B", "#102A52", "#FFFFFF", "#A8D9FF", "#2E8DFF", "#BBDFFF", "#2762A8"]),
  p("electric-lime", "Electric Lime", ["fitness", "entertainment_and_betting_visual"], "athletic", "premium_pro", "dark", "high", "graphite", ["#090D0A", "#182018", "#FFFFFF", "#C8FFD0", "#7ED957", "#D6FFBF", "#5CA83E"]),
  p("dark-athletic", "Dark Athletic", ["fitness"], "athletic", "premium", "dark", "high", "black-silver", ["#060708", "#181B20", "#FFFFFF", "#C5CCD5", "#E7EAEE", "#F4F6F8", "#6E7782"]),

  p("gaming-emerald", "Gaming Emerald", ["entertainment_and_betting_visual"], "entertainment", "premium_pro", "dark", "high", "emerald-luxury", ["#031211", "#0A2826", "#FFFFFF", "#A7F2DE", "#00C896", "#B7F5E4", "#1A8F72"]),
  p("midnight-gold", "Midnight Gold", ["entertainment_and_betting_visual", "restaurant"], "entertainment", "premium_pro", "dark", "high", "black-gold", ["#05050A", "#15151F", "#FFFFFF", "#E4CC85", "#D4AF37", "#ECD680", "#B5902C"]),
  p("electric-blue", "Electric Blue", ["entertainment_and_betting_visual", "creator"], "entertainment", "premium_pro", "dark", "high", "executive-blue", ["#030817", "#0B1632", "#FFFFFF", "#B9D5FF", "#2EA8FF", "#B8E0FF", "#1E7DC7"]),
  p("dark-neon", "Dark Neon", ["entertainment_and_betting_visual"], "entertainment", "premium_pro", "dark", "high", "graphite", ["#07070B", "#171724", "#FFFFFF", "#D4C8FF", "#8A6CFF", "#D8CCFF", "#6752C8"]),
] as const);

export type TemplatePaletteId = (typeof TEMPLATE_PALETTES)[number]["id"];

export const TEMPLATE_PALETTE_IDS = TEMPLATE_PALETTES.map((palette) => palette.id);

export function getTemplatePalette(id: string): TemplatePalette {
  const palette = TEMPLATE_PALETTES.find((candidate) => candidate.id === id);
  if (!palette) throw new Error(`Paleta desconocida: ${id}`);
  return palette;
}

export function getPalettesForIndustry(industry: IndustryId): TemplatePalette[] {
  return TEMPLATE_PALETTES.filter((palette) => palette.industries.includes(industry));
}

export function selectTemplatePalette(input: {
  industry: IndustryId;
  style: string;
  layout: "list" | "grid";
  modePreference?: PaletteMode | "auto";
  seed: string | number;
  batchId: string;
  index: number;
}): TemplatePalette {
  const candidates = getPalettesForIndustry(input.industry);
  if (candidates.length === 0) throw new Error(`No hay paletas para industria: ${input.industry}`);

  const rng = new SeededRandom(
    deriveSeed(input.seed, `palette:${input.industry}:${input.style}:${input.layout}:${input.batchId}:${input.index}`),
  );
  const modePreference = input.modePreference ?? "auto";
  const modeCandidates =
    modePreference === "auto"
      ? candidates
      : candidates.filter((palette) => palette.mode === modePreference || palette.mode === "balanced");
  return rng.pick(modeCandidates.length > 0 ? modeCandidates : candidates);
}

export function paletteToThemeAppearance(palette: TemplatePalette): ThemeAppearance {
  const { tokens } = palette;
  return {
    bgStart: tokens.background,
    bgMid: tokens.surface,
    bgEnd: tokens.background,
    textPrimary: tokens.textPrimary,
    textSubtitle: tokens.textSecondary,
    btnBgStart: tokens.surface,
    btnBgEnd: tokens.background,
    btnBorderColor: tokens.border,
    btnTextColor: tokens.textPrimary,
    accentBgStart: tokens.accent,
    accentBgEnd: tokens.accentSoft,
    accentIconColor: palette.mode === "light" ? tokens.textPrimary : tokens.background,
    profileBorderColor: tokens.border,
    banner: bannerForPalette(palette),
  };
}

function bannerForPalette(palette: TemplatePalette): ThemeAppearance["banner"] {
  return {
    enabled: true,
    heightPreset: palette.tone === "editorial" ? "compact" : "medium",
    positionY: 50,
    imageOpacity: palette.mode === "dark" ? 82 : 96,
    fusionPreset: palette.mode === "dark" ? "deep" : palette.mode === "light" ? "soft" : "medium",
    fusionStrength: palette.mode === "dark" ? 82 : palette.mode === "light" ? 42 : 64,
  };
}

function p(
  id: string,
  name: string,
  industries: TemplatePalette["industries"],
  tone: PaletteTone,
  tier: PaletteTier,
  mode: PaletteMode,
  contrastProfile: ContrastProfile,
  preferredThemeId: ThemeId,
  colors: [string, string, string, string, string, string, string],
): TemplatePalette {
  const [background, surface, textPrimary, textSecondary, accent, accentSoft, border] = colors;
  return {
    id,
    name,
    industries,
    tone,
    tier,
    mode,
    contrastProfile,
    preferredThemeId,
    tokens: {
      background,
      surface,
      textPrimary,
      textSecondary,
      accent,
      accentSoft,
      border,
    },
  };
}
