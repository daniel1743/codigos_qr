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
  avatarUrl?: string;
  avatar: {
    size: number;
    radius: number;
    borderWidth: number;
    shadow: boolean;
    overlap: number;
    align: Alignment;
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
  mediaPosition?: "left" | "right";
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
  mediaPosition?: "left" | "right";
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

export interface HeroMediaContent {
  url?: string;
  blur?: number;
}

export interface HeroBadgeContent {
  enabled?: boolean;
  label?: string;
}

export type BadgeContent = string | HeroBadgeContent;

export interface CTAContent {
  enabled?: boolean;
  label?: string;
  url?: string;
  icon?: string;
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
  frame?: DecorativeFramePreset;
}

export interface BlockLayout {
  columns?: number;
  gap?: number;
  align?: Alignment;
  width?: "content" | "wide" | "full";
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
  badges?: { id: string; label: string; icon?: string }[];
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
