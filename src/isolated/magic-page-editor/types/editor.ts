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
  | "imageCard"
  | "review"
  | "separator"
  | "service";

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
  | "imageCards"
  | "reviews"
  | "separator"
  // L2.3 — a price list (title / detail / price, no image). Its own family
  // rather than a card-family entry: `CardItem.image` is required and every
  // card layout draws a media slot, so a no-image row has nowhere to live there.
  | "services"
  // L2.5 — three block types with one anatomy (panel + heading + optional rows
  // + one action), so one implementation backs them and only the defaults
  // differ. Kept as three types because that is how the target models them and
  // how the audit scores them.
  | "cta"
  | "whatsapp"
  | "contact";

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
  | "brandIdentity"
  // ── L2.1 compositions. Appended on purpose: the union only grows at the end,
  // so no stored `variant` can ever be re-pointed at a different branch.
  | "cinematicTall"
  | "photoBand"
  | "imageThenText"
  | "centeredStack"
  | "identityBand"
  | "overlayBottom"
  | "masthead"
  | "minimalColumn"
  | "gridCollage"
  | "avatarOverlap"
  | "framedPlate";

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

/**
 * The three named steps keep their historic meaning; a number is a literal em
 * value (0.18 → `0.18em`). The Magic Patterns targets use 0.08/0.1/0.18/0.2/0.25/0.3em,
 * none of which the named steps could express.
 */
export type TextTracking = "tight" | "normal" | "wide" | number;

/** 300 / 400 / 500 / 600 / 700 / 800. */
export type TextWeight = "light" | "regular" | "medium" | "semibold" | "bold" | "extrabold";

export interface TextStyle {
  size?: number;
  bold?: boolean;
  /**
   * `| undefined` explícito: los escritores construyen el estilo desde props
   * opcionales y lo pasan a `setTextStyle`, así que con
   * `exactOptionalPropertyTypes` el tipo debe admitir `undefined` como valor.
   */
  color?: string | undefined;
  align?: TextAlign;
  upper?: boolean;
  tracking?: TextTracking | undefined;
  typeStyle?: "sans" | "editorial" | "luxury" | "mixed" | "script";
  weight?: TextWeight;
  goldText?: boolean;
  /**
   * Unitless multiplier (1.35), matching how the templates' own `leading-*`
   * classes behave. Absent leaves the template's line-height untouched.
   */
  lineHeight?: number | undefined;
  /** Adds italic. There is no way to force *off* a template's built-in italic. */
  italic?: boolean;
}

export interface BlockRef {
  key: string;
  type: BlockType;
  hidden?: boolean;
}

export type LandingBotTone = "cercano" | "formal" | "profesional";

export interface LandingBotSocial {
  instagram: string;
  tiktok: string;
  youtube: string;
  facebook: string;
  website: string;
}

export interface LandingBotPriceItem {
  name: string;
  price: string;
}

export interface LandingBotPrices {
  enabled: boolean;
  currency: string;
  items: LandingBotPriceItem[];
}

/**
 * Multi-tenant assistant configured by the landing owner (no provider/vertical
 * dependency). Every field is required (empty string = "not set") so editing is
 * deterministic and old documents without `bot` stay valid (the field is
 * optional at the PageDoc level).
 */
export interface LandingBotConfig {
  enabled: boolean;
  /** "generic" keeps the free bot icon; "custom" is Pro (avatar image or icon). */
  persona: "generic" | "custom";
  avatarUrl: string;
  avatarIcon: string;
  name: string;
  /** Who the owner is / what they do (feeds the assistant). */
  about: string;
  tone: LandingBotTone;
  whatsapp: string;
  whatsappEnabled: boolean;
  // — Pro fields (fillable later) —
  services: string;
  hours: string;
  address: string;
  faq: string;
  social: LandingBotSocial;
  stores: string;
  prices: LandingBotPrices;
}

export interface PageDoc {
  blocks: BlockRef[];
  texts: Record<string, string>;
  textStyles: Record<string, TextStyle>;
  props: Record<string, Record<string, string>>;
  removed: Record<string, boolean>;
  /** Owner-configured landing assistant. Optional to keep legacy docs valid. */
  bot?: LandingBotConfig;
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
  page: SurfaceTone;
  accent: string;
  accentFg: string;
  swatches: string[];
  radius?: number;
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
