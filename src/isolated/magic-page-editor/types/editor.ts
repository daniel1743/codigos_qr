import type { LucideIcon } from "lucide-react";

export type TemplateId = "bio" | "business" | "portfolio";
export type Device = "desktop" | "mobile";
export type MobileWidth = 360 | 390 | 430;
export type EditorMode = "edit" | "preview";
export type SheetState = "compact" | "expanded";

export type ElementKind =
  | "text"
  | "image"
  | "hero"
  | "avatar"
  | "cta"
  | "social"
  | "card"
  | "gallery"
  | "section"
  | "page"
  | "familyCard"
  | "surface"
  | "icon"
  | "price"
  | "badge"
  | "separator";

export type BlockType =
  | "hero"
  | "profile"
  | "text"
  | "links"
  | "button"
  | "social"
  | "image"
  | "gallery"
  | "video"
  | "collection"
  | "location"
  | "catalog"
  | "cardPage"
  | "cardPortfolio"
  | "cardMenu"
  | "cardStore"
  | "separator";

export type TextAlign = "left" | "center" | "right";
export type HeroVariant =
  | "simple"
  | "centered"
  | "split"
  | "image"
  | "arch"
  | "floating"
  | "banner"
  | "mosaic"
  | "frame"
  | "bleed"
  | "editorialCenter"
  | "splitHorizontal"
  | "splitVertical"
  | "fullBleed"
  | "photoCard"
  | "avatarBand"
  | "photoGrid"
  | "quote"
  | "collage"
  | "lowerBlock"
  | "galleryFrame"
  | "sideBleed"
  | "magazine"
  | "elegantOverlay"
  | "backgroundFade"
  | "minimalPremium"
  | "sideInfo"
  | "descriptionCard"
  | "cinematic"
  | "brandIdentity";

/* ---------- Card families ---------- */

export type CardFamily = "catalog" | "page" | "portfolio" | "menu" | "store";

export type CardLayout =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "balanced"
  | "editorial"
  | "compact"
  | "beforeAfter"
  | "highlight"
  | "cover"
  | "textOnly"
  | "iconText"
  | "image25"
  | "image40"
  | "imageRight"
  | "split"
  | "backgroundImage";

export type CardRatio = "25" | "35" | "50";

export interface CardItem {
  image: string;
  imageBefore?: string;
  title: string;
  description: string;
  eyebrow?: string;
  meta?: string;
  price?: string;
  previousPrice?: string;
  badge?: string;
  cta?: string;
}

export interface CardVariantDef {
  id: string;
  label: string;
  layout: CardLayout;
  ratio?: CardRatio;
  dense?: boolean;
  sale?: boolean;
}

export interface CardFamilyDef {
  id: CardFamily;
  blockType: BlockType;
  label: string;
  subtitle: string;
  visible: boolean;
  heading: string;
  sub: string;
  badgeOnImage: boolean;
  badgePresets: string[];
  variants: CardVariantDef[];
  items: CardItem[];
}
export type SocialPlatform =
  "instagram" | "tiktok" | "youtube" | "whatsapp" | "email" | "linkedin" | "web" | "phone";

export interface TextStyle {
  size?: number;
  bold?: boolean;
  color?: string;
  align?: TextAlign;
  upper?: boolean;
  tracking?: "tight" | "normal" | "wide";
  typeStyle?: "sans" | "editorial" | "luxury" | "mixed" | "script";
  weight?: "regular" | "medium" | "bold";
  goldText?: boolean;
}

export interface BlockRef {
  key: string;
  type: BlockType;
  hidden?: boolean;
}

export interface PageDoc {
  blocks: BlockRef[];
  texts: Record<string, string>;
  textStyles: Record<string, TextStyle>;
  props: Record<string, Record<string, string>>;
  removed: Record<string, boolean>;
}

export interface ElementInfo {
  id: string;
  kind: ElementKind;
  label: string;
  parentId?: string;
  blockKey?: string;
}

export interface SurfaceTone {
  id: string;
  label: string;
  color: string;
  fg: string;
  muted: string;
  surface: string;
  line: string;
}

export interface FontPair {
  id: string;
  label: string;
  display: string;
  body: string;
}

export interface Theme {
  accent: string;
  accentFg: string;
  radius: number;
  swatches: string[];
  tones: SurfaceTone[];
  pageTones: string[];
  fonts: FontPair[];
}

export interface PalettePreset {
  id: string;
  label: string;
  familyId?: string;
  variantId?: string;
  page: SurfaceTone;
  accent: string;
  accentFg: string;
  swatches: string[];
  radius?: number;
  semantic?: PaletteSemanticTokens;
}

export interface PaletteSemanticTokens {
  pageBackground: string;
  surface: string;
  secondarySurface: string;
  text: string;
  muted: string;
  accent: string;
  accentFg: string;
  line: string;
  ctaBackground: string;
  ctaForeground: string;
  iconSurface: string;
  iconForeground: string;
}

export interface PaletteFamily {
  id: string;
  label: string;
  variants: string[];
}

export interface CardPaletteValues {
  cardBg: string;
  cardSurface: string;
  cardText: string;
  cardMuted: string;
  cardLine: string;
  cardAccent: string;
  cardAccentFg: string;
  cardIconBg: string;
  cardIconColor: string;
}

export interface ThemeTokens extends Theme {
  page: SurfaceTone;
  displayFont: string;
  bodyFont: string;
  media: {
    fg: string;
    muted: string;
    surface: string;
    line: string;
    overlay: string;
  };
}

export type TourTarget = "text" | "hero" | "avatar" | "cta" | "card" | "gallery" | "section";

export type TourStep =
  "normal" | TourTarget | "add" | "advanced" | "sheet-compact" | "sheet-expanded" | "keyboard";

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  short: string;
  description: string;
  demonstrates: string[];
  slug: string;
  preview: string;
  fontsLabel: string;
  theme: Theme;
  initialBlocks: BlockRef[];
  tour: Record<TourTarget, string>;
}

export interface BlockKitItem {
  type: BlockType;
  label: string;
  description: string;
  icon: LucideIcon;
}
