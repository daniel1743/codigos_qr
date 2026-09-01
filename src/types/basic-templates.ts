import type { ComponentType } from "react";

/**
 * Basic Template system — declarative, typed, locked-structure templates.
 *
 * The structure (layout, geometry, hero shape, avatar position) is LOCKED and
 * defined by us. The user only edits the CONTENT (and, later, small safe
 * visual variations: palette / font / button style).
 *
 * This is intentionally NOT the Power Editor: no free-form layout, no drag and
 * drop, no canvas, no per-element geometry.
 */

export type TemplateFamily = "hero_profile" | "hero_cards" | "professional_corporate" | "standalone";

export type HeroStyle = "curved" | "fusion" | "straight";

/* ------------------------------------------------------------------ */
/* Editable content                                                    */
/* ------------------------------------------------------------------ */

export interface ProfileContent {
  avatarUrl: string;
  name: string;
  subtitle: string;
  bio: string;
  heroUrl: string;
  footerEnabled?: boolean;
  footerText?: string;
  ringEnabled?: boolean;
  ringColor?: string;
  ringThickness?: string;
  avatarShape?: string;
  titleColor?: string;
  bioColor?: string;
  titleFontFamily?: string;
  bioFontFamily?: string;
  titleSize?: string;
  titleWeight?: string;
  titleAlign?: string;
  bioSize?: string;
  bioWeight?: string;
  bioAlign?: string;
}

export interface LinkItem {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
  platform?: string;
  presentation?: LinkPresentation;
  card?: CardPresentation;
}

export type LinkPresentation = "button" | "card";
export type CardMediaMode = "image" | "platform_icon" | "none";
export type CardCornerStyle = "square" | "soft";
export type CardCtaLabel = "Visitar" | "Ver mi trabajo" | "Reservar" | "Más información";

export const BASIC_CARD_CTA_PRESETS: CardCtaLabel[] = [
  "Visitar",
  "Ver mi trabajo",
  "Reservar",
  "Más información",
];

export interface CardPresentation {
  title: string;
  description?: string;
  ctaLabel: string;
  mediaMode: CardMediaMode;
  imageUrl?: string;
  cornerStyle: CardCornerStyle;
}

export interface CardItem {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  enabled: boolean;
  platform?: string;
  mediaMode?: CardMediaMode;
  cornerStyle?: CardCornerStyle;
}

export type SocialPlatform =
  | "instagram"
  | "twitter"
  | "facebook"
  | "linkedin"
  | "youtube"
  | "tiktok"
  | "whatsapp"
  | "website"
  | "email";

export interface SocialItem {
  id: string;
  platform: SocialPlatform;
  url: string;
  enabled: boolean;
}

export interface ContactContent {
  phone: string;
  email: string;
  whatsapp: string;
}

export interface BasicTemplateContent {
  profile: ProfileContent;
  links: LinkItem[];
  cards: CardItem[];
  socials: SocialItem[];
  contact: ContactContent;
}

/* ------------------------------------------------------------------ */
/* Visual customization (kept intentionally small — no mini Power Ed.)  */
/* ------------------------------------------------------------------ */

export interface PaletteConfig {
  id: string;
  name: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
}

export interface FontPairConfig {
  id: string;
  name: string;
  heading: string;
  body: string;
}

export type ButtonShape = "pill" | "rounded" | "sharp" | "premium-soft";

export interface ButtonStyleConfig {
  id: string;
  name: string;
  shape: ButtonShape;
  variant: "solid" | "outline" | "soft";
}

/** Safe, resolved values shared by every Basic Template button primitive. */
export interface ButtonCustomizationConfig {
  borderWidth: 0 | 1 | 2 | 3;
  borderColor: string;
  /** Vertical gap between consecutive link buttons. */
  spacing: string;
  /** Resolved label font size (rem). */
  textSize?: string;
  /** Resolved label font weight (300 | 400 | 600 | 700). */
  textWeight?: number;
  /** Content alignment inside the button (does not move the button itself). */
  contentAlign?: "left" | "center" | "right";
  /** Icon placement relative to the label (only when an icon is present). */
  iconPosition?: "left" | "right";
}

export interface AllowedCustomization {
  palettes: PaletteConfig[];
  fontPairs: FontPairConfig[];
  buttonStyles: ButtonStyleConfig[];
}

/* ------------------------------------------------------------------ */
/* Editable field definitions (drives the lab controls)                */
/* ------------------------------------------------------------------ */

export type EditableFieldType =
  "avatar" | "name" | "subtitle" | "bio" | "hero" | "links" | "socials" | "cards" | "contact";

export interface EditableFieldDefinition {
  key: string;
  label: string;
  type: EditableFieldType;
}

/* ------------------------------------------------------------------ */
/* Template structure & definition                                     */
/* ------------------------------------------------------------------ */

export interface TemplateStructure {
  family: TemplateFamily;
  heroStyle: HeroStyle;
  layout: "locked";
  locked: string[];
}

export interface TemplateVariant {
  id: string;
  name: string;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  family: TemplateFamily;
  description: string;
  visualDirection: string[];
  structure: TemplateStructure;
  editable: EditableFieldDefinition[];
  customization: AllowedCustomization;
  supportsCards: boolean;
  supportsContact: boolean;
  maxCards: number;
}

/* ------------------------------------------------------------------ */
/* Runtime config & renderer                                           */
/* ------------------------------------------------------------------ */

export interface BasicTemplateConfig {
  template: TemplateDefinition;
  content: BasicTemplateContent;
  palette: PaletteConfig;
  fontPair: FontPairConfig;
  buttonStyle: ButtonStyleConfig;
  buttonCustomization: ButtonCustomizationConfig;
  heroFusionStrength: number;
}

/**
 * Editor-only registry. Renderers register visible content targets without
 * knowing which control initiated the edit. Public/standalone renders simply
 * omit it, so they never receive selection UI.
 */
export interface EditTargetRegistry {
  register: (targetId: string, element: HTMLElement | null) => void;
  select?: (targetId: string) => void;
}

export const EDIT_TARGETS = {
  hero: "hero",
  avatar: "profile-avatar",
  name: "profile-name",
  subtitle: "profile-subtitle",
  bio: "profile-bio",
  footer: "profile-footer",
  links: "links-section",
  socials: "socials-section",
  cards: "cards-section",
  contact: "contact-section",
} as const;

export function linkEditTarget(id: string): string {
  return id.startsWith("link-") ? id : `link-${id}`;
}

export function cardEditTarget(id: string): string {
  return id.startsWith("card-") ? id : `card-${id}`;
}

export function socialEditTarget(id: string): string {
  return id.startsWith("social-") ? id : `social-${id}`;
}

export interface BasicTemplateRendererProps {
  config: BasicTemplateConfig;
  /** Preview width in px. When set, the renderer scales to a phone frame. */
  width?: number;
  /** Optional editor-only target registry. Omit for public/full preview renders. */
  targetRegistry?: EditTargetRegistry | undefined;
  /** Editor-only, short-lived target highlight. */
  highlightedTarget?: string | null | undefined;
}

export type BasicTemplateRenderer = ComponentType<BasicTemplateRendererProps>;
