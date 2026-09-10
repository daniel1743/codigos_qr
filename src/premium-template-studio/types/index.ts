/**
 * PREMIUM TEMPLATE ENGINE — TYPE SYSTEM
 *
 * Everything here must remain 100% serializable (JSON).
 * Never store JSX, functions or React components inside a config object.
 */

export const SCHEMA_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

export type Breakpoint = "desktop" | "tablet" | "mobile";

export type Alignment = "left" | "center" | "right";

export type AnimationPreset = "none" | "fade" | "slide" | "scale" | "soft-rise";

export type TexturePreset = "none" | "grain" | "paper" | "linen" | "mesh" | "frost";

export type DecorativeFramePreset =
  "none" | "hairline" | "double" | "inset" | "gradient" | "luxury" | "glow";

export type EntrancePreset = "none" | "fade" | "soft-rise" | "slide-up" | "scale-in";

export type HoverPreset = "none" | "lift" | "soft-scale" | "glow" | "border-emphasis";

export type MotionPresetId = "minimal" | "soft" | "editorial" | "creator" | "none";

export interface MotionConfig {
  preset: MotionPresetId;
  entrance: EntrancePreset;
  hover: HoverPreset;
  duration: number;
  delay: number;
  stagger: number;
}

export interface BlockMotionOverride {
  useGlobal?: boolean;
  entrance?: EntrancePreset;
  hover?: HoverPreset;
  disableMotion?: boolean;
}

export interface ResponsiveVisibility {
  desktop: boolean;
  tablet: boolean;
  mobile: boolean;
}

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* THEME EXTENSION POINT — add tokens here, then map them in           */
/* engine/themeToCssVars.ts so every block picks them up for free.     */
/* ------------------------------------------------------------------ */

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  mutedText: string;
  border: string;
  // Expanded tokens
  surfaceAlt?: string;
  success?: string;
  warning?: string;
  danger?: string;
}

export interface TypographySizeConfig {
  size: number;
  weight: number;
  lineHeight: number;
  letterSpacing: number;
}

export interface ThemeTypography {
  headingFont: string;
  bodyFont: string;
  headingSize: number; // px, base for h1
  bodySize: number; // px
  headingWeight: number;
  bodyWeight: number;
  lineHeight: number;
  letterSpacing: number; // em
  // Expanded scales
  scale?: {
    xs: TypographySizeConfig;
    sm: TypographySizeConfig;
    md: TypographySizeConfig;
    lg: TypographySizeConfig;
    xl: TypographySizeConfig;
    display: TypographySizeConfig;
  };
}

export interface ThemeBackground {
  type: "solid" | "gradient" | "image" | "pattern";
  color?: string;
  gradient?: {
    kind: "linear" | "radial";
    angle: number;
    from: string;
    to: string;
  };
  imageUrl?: string;
  overlay?: number; // 0..1
  blur?: number; // px
  pattern?: "dots" | "grid" | "noise" | "rings";
}

export interface ThemeTexture {
  preset: TexturePreset;
  opacity: number;
  scale?: number;
}

export type CardPreset = "minimal" | "soft" | "glass" | "elevated" | "flat" | "luxury";
export type ButtonVariant = "solid" | "outline" | "ghost" | "glass" | "gradient" | "soft";

export interface ThemeCards {
  preset: CardPreset;
  radius: number;
  borderWidth: number;
  shadow: "none" | "sm" | "md" | "lg" | "glow" | "soft" | "elevated" | "floating";
  blur: number;
  padding: number;
  opacity: number; // surface opacity 0..1
}

export interface ThemeButtons {
  variant: ButtonVariant;
  radius: number;
  height: number;
  fontWeight: number;
  shadow: "none" | "sm" | "md" | "lg" | "glow" | "soft" | "elevated" | "floating";
  borderWidth: number;
}

export interface ThemeSpacing {
  section: number;
  block: number;
  contentWidth: number;
  scale?: number[];
}

export interface ThemeRadii {
  none: number;
  small: number;
  medium: number;
  large: number;
  xl: number;
  pill: number;
}

export interface ThemeShadows {
  none: string;
  soft: string;
  elevated: string;
  floating: string;
  glow: string;
}

export interface ThemeBorders {
  none: { width: number; style: string };
  subtle: { width: number; style: string };
  standard: { width: number; style: string };
  strong: { width: number; style: string };
}

export interface ThemeGradients {
  aurora: string;
  ocean: string;
  sunset: string;
  midnight: string;
  softNeutral: string;
}

export interface ThemeSurfaces {
  solid: { opacity: number; blur: number };
  soft: { opacity: number; blur: number };
  glass: { opacity: number; blur: number };
  transparent: { opacity: number; blur: number };
}

export interface TemplateTheme {
  id: string;
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  background: ThemeBackground;
  texture?: ThemeTexture;
  cards: ThemeCards;
  buttons: ThemeButtons;
  spacing: ThemeSpacing;
  animation: AnimationPreset;
  // Expanded Design System Tokens
  radii?: ThemeRadii;
  shadows?: ThemeShadows;
  borders?: ThemeBorders;
  gradients?: ThemeGradients;
  surfaces?: ThemeSurfaces;
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export type LayoutId =
  | "centered"
  | "editorial"
  | "bento"
  | "split"
  | "compact"
  | "full-width"
  | "profile-card"
  | "portfolio"
  | "executive";

export interface LayoutResponsiveRule {
  columns: number;
  gutter: number;
  align: Alignment;
  padding: number;
  gap?: number;
  alignItems?: "start" | "center" | "end" | "stretch";
  justifyItems?: "start" | "center" | "end" | "stretch";
  contentWidth?: number;
}

export interface TemplateLayout {
  id: LayoutId;
  name: string;
  /** how the profile header composes with the banner */
  header: "overlap" | "stacked" | "inline" | "hero";
  responsive: Record<Breakpoint, LayoutResponsiveRule>;
  type?: "stack" | "grid" | "bento";
  gap?: number;
  contentWidth?: number;
  alignItems?: "start" | "center" | "end" | "stretch";
  justifyItems?: "start" | "center" | "end" | "stretch";
}

/* ------------------------------------------------------------------ */
/* Profile / content                                                   */
/* ------------------------------------------------------------------ */

export interface TemplateProfile {
  name: string;
  username: string;
  role?: string;
  company?: string;
  location?: string;
  description?: string;
  verified?: boolean;
  /**
   * Trusted, system-controlled verification variant. Populated by the backend
   * from `profiles.verification_variant` — NOT editable from the Power Editor.
   * Absent ⇒ fall back to the legacy `verified` boolean for `standard`.
   */
  verificationVariant?: "none" | "standard" | "official-gold";
  avatarUrl?: string;
  avatar: {
    size: number;
    radius: number;
    borderWidth: number;
    shadow: boolean;
    overlap: number;
    align: Alignment;
    /**
     * Optional configurable rim. Absent ⇒ off (existing background-colored
     * border). Reuses `borderWidth` as the rim thickness.
     */
    rim?: {
      enabled: boolean;
      color: string;
      /** Semantic thickness. Absent ⇒ "medium". */
      width?: "thin" | "medium" | "thick";
    };
  };
  banner: {
    enabled: boolean;
    imageUrl?: string;
    height: number;
    mobileHeight: number;
    overlay: number;
    blur: number;
    gradient: boolean;
    focalX: number;
    focalY: number;
    radius: number;
    /**
     * How the cover relates to the rendered page surface.
     * Absent ⇒ "contained" (exact legacy presentation — backward compatible).
     */
    widthMode?: "contained" | "full-bleed";
    /**
     * Optional lower-edge blend/fade into the page background.
     * Absent ⇒ off (exact 5C6A presentation — backward compatible).
     */
    blendFade?: {
      enabled: boolean;
      /** vertical px of the cover that participates in the fade */
      distance: number;
      /** 0..1 — how strongly the bottom edge disappears */
      strength: number;
    };
  };
}

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* BLOCK EXTENSION POINT — add the union member, defaults in           */
/* constants/blockDefinitions.ts and a renderer in engine/BlockRegistry*/
/* ------------------------------------------------------------------ */

export type BlockType =
  | "hero"
  | "heading"
  | "text"
  | "links"
  | "featuredLink"
  | "buttonGroup"
  | "cta"
  | "social"
  | "video"
  | "image"
  | "gallery"
  | "mediaCard"
  | "portfolio"
  | "document"
  | "contact"
  | "qr"
  | "trust"
  | "divider"
  | "spacer"
  | "stats"
  | "services"
  | "testimonials"
  | "pricing"
  | "faq"
  | "timeline"
  | "featuredMedia"
  | "floatingActions"
  | "product"
  | "productGrid"
  | "booking"
  | "calendar"
  | "events"
  | "map"
  | "music"
  | "carousel"
  | "tabs"
  | "bottomNav";

export interface LinkItem {
  id: string;
  label: string;
  description?: string;
  url: string;
  icon?: string;
  imageUrl?: string;
  featured?: boolean;
  newTab?: boolean;
  presentation?: "button" | "card" | "media-card";
  mediaPosition?: "left" | "right" | "bottom";
  mediaSize?: "25" | "50" | "100";
}

/** Explicit item payload shared by the currently registered block families. */
export interface BlockItem {
  id: string;
  label?: string;
  url?: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  featured?: boolean;
  newTab?: boolean;
  presentation?: "button" | "card" | "media-card";
  mediaPosition?: "left" | "right" | "bottom";
  mediaSize?: "25" | "50" | "100";
  title?: string;
  name?: string;
  role?: string;
  quote?: string;
  source?: string;
  rating?: number;
  recommended?: boolean;
  question?: string;
  answer?: string;
  contentText?: string;
  date?: string;
  time?: string;
  location?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  linkUrl?: string;
  price?: string;
  period?: string;
  value?: string | number;
  features?: string[];
  helperText?: string;
  avatarUrl?: string;
}

export interface HeroAvatarContent {
  size?: number;
  radius?: number | "full";
  url?: string;
  imageUrl?: string;
  overlap?: number;
  borderWidth?: number;
  shadow?: boolean | "none" | "soft" | "hard";
}

export type ImageFit = "cover" | "contain";

export type ImagePosition =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface HeroMediaContent {
  url?: string;
  blur?: number;
  /** Absent → "cover" (current default). */
  fit?: ImageFit;
  /** Absent → "center" (current default). */
  position?: ImagePosition;
}

export interface HeroBadgeContent {
  enabled?: boolean;
  label?: string;
}

export type BadgeContent = string | HeroBadgeContent;

export interface CTAStyle {
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  paddingX?: number;
  paddingY?: number;
}

export interface CTAContent {
  enabled?: boolean;
  label?: string;
  url?: string;
  icon?: string;
  /**
   * Per-CTA visual overrides. Absent → the current hardcoded/theme default
   * rendering. Each present field overrides only that one property; the
   * remaining properties keep their theme/default values.
   */
  style?: CTAStyle;
}

export interface MapLocation {
  lat?: number;
  lng?: number;
  label?: string;
}

export interface SocialItem {
  id: string;
  platform: string;
  url: string;
}

export interface BlockStyle {
  variant?: string;
  background?: string;
  textColor?: string;
  accentColor?: string;
  radius?: number;
  shadow?: "none" | "sm" | "md" | "lg" | "glow";
  borderWidth?: number;
  padding?: number;
  minHeight?: number;
  overlay?: {
    type?: "solid" | "gradient";
    opacity?: number;
    direction?: "to-top" | "to-bottom";
  };
  /**
   * Block-level background gradient. Distinct from `overlay` (which sits above
   * the background) — this replaces/augments the solid `background` color.
   * Absent → existing solid background behavior.
   */
  backgroundGradient?: {
    from?: string;
    to?: string;
    angle?: number;
  };
  frame?: DecorativeFramePreset;
}

export interface BlockLayout {
  columns?: number;
  gap?: number;
  align?: Alignment;
  width?: "content" | "wide" | "full";
  /**
   * TRUE full-bleed: escape the renderer grid/container and span the document
   * edge-to-edge. Distinct from `width: "full"` (which only spans grid columns).
   * Absent → existing contained/inset layout behavior.
   */
  trueFullBleed?: boolean;
  span?: number; // bento span (1..2)
  aspect?: "square" | "video" | "portrait" | "auto";
  colSpan?: number;
  rowSpan?: number;
  constraints?: {
    position?: string;
    zIndex?: number;
    overflow?: "visible" | "hidden" | "clip" | "auto";
    minWidth?: number | string | null;
    maxWidth?: number | string | null;
    minHeight?: number | string | null;
    maxHeight?: number | string | null;
    aspectRatio?: string | null;
  };
  overlap?: {
    enabled?: boolean;
    amount?: number;
    direction?: "top" | "bottom" | "left" | "right";
  };
  offset?: {
    x?: number;
    y?: number;
  };
  zIndex?: number;
  sticky?: {
    enabled?: boolean;
    top?: number;
  };
  floating?: {
    enabled?: boolean;
    anchor?: "bottom-right" | "bottom-left" | "bottom-center" | "top-right" | "top-left";
    offset?: number;
  };
}

export interface BlockInteraction {
  newTab?: boolean;
  animation?: AnimationPreset;
  trackingId?: string;
}

/** Canonical ids for the Trust ("Confianza") block signal catalog. */
export type TrustSignalType =
  | "availability_24h"
  | "response_time"
  | "rating"
  | "experience"
  | "customers_served"
  | "certification"
  | "award"
  | "guarantee"
  | "local_business"
  | "verified_profile";

/**
 * A single trust signal. Reuses the existing `badges` storage slot while
 * adding a typed `type` and optional value fields. Legacy badges carry only
 * `label`/`icon` and remain renderable for backward compatibility.
 */
export interface TrustBadge {
  id: string;
  /** Legacy display label (superseded by `type`-derived labels). */
  label?: string;
  icon?: string;
  /** Signal type when this badge represents a typed trust signal. */
  type?: TrustSignalType;
  /** Typed value: rating value, response hours, experience years, customers count, or free text. */
  value?: number | string;
  /** Optional review count for the `rating` signal. */
  reviewCount?: number;
}

/** Free-form but serializable content bag, narrowed per block type. */
export interface BlockContent {
  title?: string;
  subtitle?: string;
  body?: string;
  label?: string;
  url?: string;
  imageUrl?: string;
  images?: { id: string; url: string; alt?: string }[];
  items?: BlockItem[];
  socials?: SocialItem[];
  provider?: "youtube" | "vimeo";
  videoId?: string;
  fileName?: string;
  fileSize?: string;
  email?: string;
  phone?: string;
  address?: string;
  badges?: TrustBadge[];
  /** Master visibility toggle for blocks that support enable/disable (e.g. Trust). */
  enabled?: boolean;
  height?: number;
  alt?: string;
  description?: string;
  eyebrow?: string;
  ctaDirection?: "row" | "column";
  avatar?: HeroAvatarContent;
  bannerImage?: HeroMediaContent;
  backgroundImage?: HeroMediaContent;
  /** Legacy product blocks use a display string; hero blocks use the structured shape. */
  badge?: BadgeContent;
  primaryCTA?: CTAContent;
  secondaryCTA?: CTAContent;
  behavior?: { allowMultipleOpen?: boolean };
  website?: string;
  whatsappUrl?: string;
  bookingUrl?: string;
  downloadContact?: boolean;
  customCtaUrl?: string;
  customCtaLabel?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  mediaType?: string;
  videoProvider?: "youtube" | "vimeo";
  artist?: string;
  coverUrl?: string;
  audioUrl?: string;
  service?: string;
  duration?: string;
  price?: string;
  comparePrice?: string;
  availableDates?: string[];
  availableTimes?: string[];
  disabledDates?: string[];
  location?: MapLocation;
  products?: BlockItem[];
}

export interface TemplateBlock {
  id: string;
  type: BlockType;
  variant: string;
  content: BlockContent;
  style: BlockStyle;
  layout: BlockLayout;
  visibility: ResponsiveVisibility;
  interaction: BlockInteraction;
  motion?: BlockMotionOverride;
  locked?: boolean;
  responsive?: Record<
    Breakpoint,
    {
      colSpan?: number;
      rowSpan?: number;
      order?: number;
      align?: Alignment;
      padding?: number;
      visible?: boolean;
      minHeight?: number;
      ctaDirection?: "row" | "column";
      avatarSize?: number;
      constraints?: BlockLayout["constraints"];
      overlap?: BlockLayout["overlap"];
      offset?: BlockLayout["offset"];
      zIndex?: number;
      sticky?: BlockLayout["sticky"];
      floating?: BlockLayout["floating"];
    }
  >;
}

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

export interface TemplateSEO {
  title: string;
  description: string;
  socialImage?: string;
  canonical?: string;
  index: boolean;
}

export interface TemplateMetadata {
  templateDefinitionId: string;
  name: string;
  category: TemplateCategory;
  premium: boolean;
  createdAt: string;
  updatedAt: string;
  author?: string;
  tags?: string[];
}

export interface TemplateSettings {
  showBranding: boolean;
  slug: string;
  animation: AnimationPreset;
  language: string;
}

export interface BioTemplateConfig {
  schemaVersion: number;
  /** unique per user page instance */
  pageInstanceId: string;
  /** the reusable template definition this page was created from */
  templateDefinitionId: string;
  metadata: TemplateMetadata;
  theme: TemplateTheme;
  layout: TemplateLayout;
  profile: TemplateProfile;
  blocks: TemplateBlock[];
  seo: TemplateSEO;
  settings: TemplateSettings;
  motion?: MotionConfig;
}

/* ------------------------------------------------------------------ */
/* Template definitions / gallery                                      */
/* ------------------------------------------------------------------ */

export type TemplateCategory =
  | "Creator"
  | "Professional"
  | "Business"
  | "Personal"
  | "Minimal"
  | "Luxury"
  | "Portfolio"
  | "Executive"
  | "Corporate"
  | "Artist"
  | "Technology"
  | "Medical"
  | "Barber / Beauty"
  | "Restaurant"
  | "Store / Product"
  | "Fitness"
  | "Music / Artist"
  | "Real Estate";

export interface TemplateDefinition {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  thumbnail?: string;
  version?: number;
  tags?: string[];
  premium: boolean;
  supportedCapabilities?: string[];
  base: string;
  layout: LayoutId;
  themeId: string;
  /** blocks the definition ships with (content is demo content) */
  build: () => BioTemplateConfig;
}

/* ------------------------------------------------------------------ */
/* Host integration                                                    */
/* HOST INTEGRATION POINT                                              */
/* ------------------------------------------------------------------ */

export interface StudioUser {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  plan?: "free" | "pro" | "business";
}

export interface UploadedAsset {
  id: string;
  url: string;
  name: string;
  type: "image" | "video" | "document";
  size?: number;
  createdAt?: string;
}

export type SaveState = "idle" | "saving" | "saved" | "dirty" | "error";

export interface ValidationIssue {
  level: "error" | "warning";
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
