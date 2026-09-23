export type DirectPageBlockType =
  | "hero"
  | "profile"
  | "text"
  | "links"
  | "social"
  | "image"
  | "gallery"
  | "video"
  | "collection"
  | "location";

export type DirectAlignment = "left" | "center" | "right";
export type DirectVisibility = { desktop: boolean; tablet: boolean; mobile: boolean };
export type DirectContent = Record<string, unknown> & { items?: DirectItem[] };

export interface DirectItem {
  id: string;
  title?: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  price?: string;
  badge?: string;
  cta?: { label?: string; url?: string };
  ctaLabel?: string;
  ctaUrl?: string;
  [key: string]: unknown;
}

export interface PageDocumentThemeV1 {
  pageBackground: string;
  surface: string;
  primaryText: string;
  secondaryText: string;
  accent: string;
  border: string;
  fontFamily: string;
  typographyScale: Record<string, unknown>;
  radius: number;
  buttonStyle: Record<string, unknown>;
  spacingScale: Record<string, unknown>;
  contentWidth: number;
}

export interface PageDocumentBlockV1 {
  id: string;
  type: DirectPageBlockType;
  variant: string;
  visible: boolean;
  visibility: DirectVisibility;
  layout: {
    spacing: "compact" | "normal" | "relaxed";
    width: "content" | "wide" | "full";
    alignment: DirectAlignment;
  };
  content: DirectContent;
  style: Record<string, unknown>;
}

export interface PageDocumentV1 {
  documentType: "direct-page";
  version: 1;
  theme: PageDocumentThemeV1;
  blocks: PageDocumentBlockV1[];
  footer: { visible: boolean; content: Record<string, unknown> };
}

export const PAGE_DOCUMENT_ADAPTER_SCOPE = {
  collectionToServices: "PILOT_ONLY",
  unsupportedFooterContent: "PILOT_ONLY_UNSUPPORTED_GENERIC_FOOTER",
} as const;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function visibilityOf(value: unknown): DirectVisibility {
  const input = record(value);
  return {
    desktop: input.desktop !== false,
    tablet: input.tablet !== false,
    mobile: input.mobile !== false,
  };
}

function alignmentOf(value: unknown): DirectAlignment {
  const input = record(value);
  const candidate = input.alignment ?? input.align;
  return candidate === "right" || candidate === "center" ? candidate : "left";
}

function directTypeOf(value: unknown): DirectPageBlockType {
  if (
    value === "hero" ||
    value === "profile" ||
    value === "text" ||
    value === "links" ||
    value === "social" ||
    value === "image" ||
    value === "gallery" ||
    value === "video" ||
    value === "location"
  )
    return value;
  if (
    value === "services" ||
    value === "productGrid" ||
    value === "pricing" ||
    value === "testimonials"
  )
    return "collection";
  return "text";
}

function spacingOf(style: Record<string, unknown>): PageDocumentBlockV1["layout"]["spacing"] {
  const padding = typeof style.padding === "number" ? style.padding : 24;
  return padding <= 16 ? "compact" : padding >= 36 ? "relaxed" : "normal";
}

function themeFromLegacy(theme: Record<string, unknown>): PageDocumentThemeV1 {
  const colors = record(theme.colors);
  const typography = record(theme.typography);
  const buttons = record(theme.buttons);
  const spacing = record(theme.spacing);
  const cards = record(theme.cards);
  return {
    pageBackground: String(colors.background ?? "#f7f4ef"),
    surface: String(colors.surface ?? "#ffffff"),
    primaryText: String(colors.text ?? "#1f2937"),
    secondaryText: String(colors.mutedText ?? "#6b7280"),
    accent: String(colors.accent ?? "#0f766e"),
    border: String(colors.border ?? "#e5e7eb"),
    fontFamily: String(typography.bodyFont ?? "Inter"),
    typographyScale: clone(typography),
    radius: typeof cards.radius === "number" ? cards.radius : 24,
    buttonStyle: clone(buttons),
    spacingScale: clone(spacing),
    contentWidth: typeof spacing.contentWidth === "number" ? spacing.contentWidth : 960,
  };
}

export function pageDocumentFromLegacy(value: unknown, title = "Direct Page"): PageDocumentV1 {
  const config = record(record(value).editorConfig ?? value);
  const profile = record(config.profile);
  const legacyBlocks = Array.isArray(config.blocks) ? config.blocks : [];
  const blocks: PageDocumentBlockV1[] = legacyBlocks.map((raw, index) => {
    const block = record(raw);
    const style = record(block.style);
    const layout = record(block.layout);
    const content = clone(record(block.content)) as DirectContent;
    const type = directTypeOf(block.type);
    if (type === "collection" && Array.isArray(content.products) && !content.items)
      content.items = clone(content.products) as DirectItem[];
    return {
      id: String(block.id ?? `direct-block-${index + 1}`),
      type,
      variant: String(block.variant ?? (type === "collection" ? "services" : "default")),
      visible: Object.values(visibilityOf(block.visibility)).some(Boolean),
      visibility: visibilityOf(block.visibility),
      layout: {
        spacing: spacingOf(style),
        width: layout.width === "wide" ? "wide" : layout.width === "full" ? "full" : "content",
        alignment: alignmentOf(layout),
      },
      content,
      style: clone(style),
    };
  });
  const banner = record(profile.banner);
  const profileBlock: PageDocumentBlockV1 = {
    id: "direct-profile",
    type: "profile",
    variant: "default",
    visible: true,
    visibility: { desktop: true, tablet: true, mobile: true },
    layout: { spacing: "normal", width: "content", alignment: "center" },
    content: {
      name: String(profile.name ?? title),
      role: String(profile.role ?? ""),
      description: String(profile.description ?? ""),
      image: String(profile.avatarUrl ?? ""),
      bannerImage: String(banner.imageUrl ?? ""),
    },
    style: {},
  };
  const otherBlocks = blocks.filter((block) => block.id !== "direct-profile" && block.type !== "hero");
  const heroBlocks = blocks.filter((block) => block.type === "hero");
  
  // Clean up duplicate identity from Hero if it's the main bio composition
  const cleanedHeroBlocks = heroBlocks.map(hero => {
    if (hero.variant === "centered_overlap" || !hero.variant) {
      return {
        ...hero,
        content: {
          ...hero.content,
          title: "",
          subtitle: "",
          description: "",
          eyebrow: ""
        }
      }
    }
    return hero;
  });

  return {
    documentType: "direct-page",
    version: 1,
    theme: themeFromLegacy(record(config.theme)),
    blocks: [...cleanedHeroBlocks, profileBlock, ...otherBlocks],
    footer: {
      visible: record(config.settings).showBranding !== false,
      content: { branding: "Cripqer" },
    },
  };
}

export function isPageDocumentV1(value: unknown): value is PageDocumentV1 {
  return validatePageDocumentV1(value).valid;
}

const supportedBlockTypes = new Set<DirectPageBlockType>([
  "hero",
  "profile",
  "text",
  "links",
  "social",
  "image",
  "gallery",
  "video",
  "collection",
  "location",
]);

export function validatePageDocumentV1(value: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const input = record(value);
  if (input.documentType !== "direct-page") errors.push("documentType must be direct-page.");
  if (input.version !== 1) errors.push("version must be 1.");
  const theme = record(input.theme);
  for (const token of [
    "pageBackground",
    "surface",
    "primaryText",
    "secondaryText",
    "accent",
    "border",
    "fontFamily",
  ])
    if (typeof theme[token] !== "string") errors.push(`theme.${token} must be a string.`);
  if (typeof theme.radius !== "number" || !Number.isFinite(theme.radius))
    errors.push("theme.radius must be a finite number.");
  if (typeof theme.contentWidth !== "number" || !Number.isFinite(theme.contentWidth))
    errors.push("theme.contentWidth must be a finite number.");
  if (!Array.isArray(input.blocks)) errors.push("blocks must be an array.");
  const blockIds = new Set<string>();
  for (const raw of Array.isArray(input.blocks) ? input.blocks : []) {
    const block = record(raw);
    const id = typeof block.id === "string" ? block.id : "";
    if (!id) errors.push("each block requires an id.");
    if (blockIds.has(id)) errors.push(`duplicate block id: ${id}.`);
    blockIds.add(id);
    if (!supportedBlockTypes.has(block.type as DirectPageBlockType))
      errors.push(`unsupported block type: ${String(block.type)}.`);
    if (typeof block.variant !== "string") errors.push(`block ${id} requires a variant.`);
    if (typeof block.visible !== "boolean") errors.push(`block ${id} requires visible.`);
    const visibility = record(block.visibility);
    for (const key of ["desktop", "tablet", "mobile"])
      if (typeof visibility[key] !== "boolean")
        errors.push(`block ${id} visibility.${key} must be boolean.`);
    const layout = record(block.layout);
    if (!["compact", "normal", "relaxed"].includes(String(layout.spacing)))
      errors.push(`block ${id} has invalid spacing.`);
    if (!["content", "wide", "full"].includes(String(layout.width)))
      errors.push(`block ${id} has invalid width.`);
    if (!["left", "center", "right"].includes(String(layout.alignment)))
      errors.push(`block ${id} has invalid alignment.`);
    const content = record(block.content);
    const itemIds = new Set<string>();
    for (const item of Array.isArray(content.items) ? content.items : []) {
      const itemRecord = record(item);
      const itemId = typeof itemRecord.id === "string" ? itemRecord.id : "";
      if (!itemId) errors.push(`block ${id} item requires an id.`);
      if (itemIds.has(itemId)) errors.push(`duplicate item id: ${itemId}.`);
      itemIds.add(itemId);
    }
  }
  const footer = record(input.footer);
  if (typeof footer.visible !== "boolean" || !record(footer.content))
    errors.push("footer shape is invalid.");
  return { valid: errors.length === 0, errors };
}

export function cloneCollectionItem(item: DirectItem, newId: string): DirectItem {
  return { ...clone(item), id: newId };
}

export function reorderPageDocumentBlock(
  document: PageDocumentV1,
  blockId: string,
  direction: -1 | 1,
): PageDocumentV1 {
  const index = document.blocks.findIndex((block) => block.id === blockId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= document.blocks.length) return document;
  const blocks = [...document.blocks];
  [blocks[index], blocks[nextIndex]] = [blocks[nextIndex]!, blocks[index]!];
  return { ...document, blocks };
}
