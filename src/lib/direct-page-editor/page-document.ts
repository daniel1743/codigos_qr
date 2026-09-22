import type {
  Alignment,
  BioTemplateConfig,
  BlockContent,
  BlockItem,
  BlockType,
  TemplateBlock,
} from "../../premium-template-studio/types";

export type PageDocumentBlockType =
  | "hero"
  | "profile"
  | "text"
  | "links"
  | "social"
  | "image"
  | "gallery"
  | "video"
  | "collection"
  | "location"
  | Exclude<
      BlockType,
      "hero" | "text" | "links" | "social" | "image" | "gallery" | "video" | "services"
    >;

export interface PageDocumentThemeV1 {
  pageBackground: string;
  surface: string;
  primaryText: string;
  secondaryText: string;
  accent: string;
  border: string;
  fontFamily: string;
  typographyScale: BioTemplateConfig["theme"]["typography"];
  radius: number;
  buttonStyle: BioTemplateConfig["theme"]["buttons"];
  spacingScale: BioTemplateConfig["theme"]["spacing"];
  contentWidth: number;
}

export interface PageDocumentBlockV1 {
  id: string;
  type: PageDocumentBlockType;
  variant: string;
  visible: boolean;
  visibility: TemplateBlock["visibility"];
  layout: {
    spacing: "compact" | "normal" | "relaxed";
    width: "content" | "wide";
    align: Alignment;
  };
  content: BlockContent;
  style: TemplateBlock["style"];
}

/** The collection-to-services bridge is intentionally limited to this pilot. */
export const PAGE_DOCUMENT_ADAPTER_SCOPE = {
  collectionToServices: "PILOT_ONLY",
  unsupportedFooterContent: "PILOT_ONLY_UNSUPPORTED",
} as const;

export interface PageDocumentV1 {
  version: 1;
  theme: PageDocumentThemeV1;
  blocks: PageDocumentBlockV1[];
  footer: { visible: boolean; content: Record<string, string> };
}

function pageTypeOf(type: BlockType): PageDocumentBlockType {
  return type === "services" ? "collection" : type;
}

function canonicalTypeOf(type: PageDocumentBlockType): BlockType {
  // PageDocumentV1 uses the portable name "collection". The current Services
  // renderer is the only supported canonical target in this pilot.
  return type === "collection" ? "services" : (type as BlockType);
}

function spacingOf(block: TemplateBlock): PageDocumentBlockV1["layout"]["spacing"] {
  const padding = block.style.padding ?? 24;
  return padding <= 16 ? "compact" : padding >= 36 ? "relaxed" : "normal";
}

function toDocumentBlock(block: TemplateBlock): PageDocumentBlockV1 {
  return {
    id: block.id,
    type: pageTypeOf(block.type),
    variant: block.variant,
    visible: block.visibility.desktop || block.visibility.tablet || block.visibility.mobile,
    visibility: structuredClone(block.visibility),
    layout: {
      spacing: spacingOf(block),
      width: block.layout.width === "wide" || block.layout.width === "full" ? "wide" : "content",
      align: block.layout.align ?? "left",
    },
    content: structuredClone(block.content),
    style: structuredClone(block.style),
  };
}

export function pageDocumentFromCanonical(config: BioTemplateConfig): PageDocumentV1 {
  const { colors, typography, buttons, spacing } = config.theme;
  return {
    version: 1,
    theme: {
      pageBackground: colors.background,
      surface: colors.surface,
      primaryText: colors.text,
      secondaryText: colors.mutedText,
      accent: colors.accent,
      border: colors.border,
      fontFamily: typography.bodyFont,
      typographyScale: structuredClone(typography),
      radius: config.theme.cards.radius,
      buttonStyle: structuredClone(buttons),
      spacingScale: structuredClone(spacing),
      contentWidth: spacing.contentWidth,
    },
    blocks: config.blocks.map(toDocumentBlock),
    footer: { visible: config.settings.showBranding, content: { branding: "Cripqer" } },
  };
}

function alignmentOf(block: PageDocumentBlockV1): Alignment {
  return block.layout.align ?? block.style.titleTypography?.textAlign ?? "left";
}

function toCanonicalBlock(
  block: PageDocumentBlockV1,
  previous: TemplateBlock | undefined,
): TemplateBlock {
  const visibility =
    block.visibility ??
    (block.visible
      ? { desktop: true, tablet: true, mobile: true }
      : { desktop: false, tablet: false, mobile: false });
  return {
    id: block.id,
    type: canonicalTypeOf(block.type),
    variant: block.variant,
    content: structuredClone(block.content),
    style: structuredClone(block.style),
    layout: {
      ...(previous?.layout ?? {}),
      width: block.layout.width === "wide" ? "wide" : "content",
      align: block.layout.align ?? previous?.layout.align ?? alignmentOf(block),
    },
    visibility,
    interaction: structuredClone(previous?.interaction ?? { animation: "none", newTab: true }),
    motion: structuredClone(previous?.motion),
    locked: previous?.locked,
    responsive: structuredClone(previous?.responsive),
  };
}

/**
 * Converts the pilot document back to the current renderer contract while
 * retaining unknown block fields from the loaded canonical block when IDs
 * still match. This keeps the adapter reversible for existing pages.
 */
export function canonicalFromPageDocument(
  document: PageDocumentV1,
  base: BioTemplateConfig,
): BioTemplateConfig {
  const previousById = new Map(base.blocks.map((block) => [block.id, block]));
  const colors = base.theme.colors;
  return {
    ...base,
    schemaVersion: 1,
    theme: {
      ...base.theme,
      colors: {
        ...colors,
        background: document.theme.pageBackground,
        surface: document.theme.surface,
        text: document.theme.primaryText,
        mutedText: document.theme.secondaryText,
        accent: document.theme.accent,
        border: document.theme.border,
      },
      typography: structuredClone(document.theme.typographyScale),
      buttons: structuredClone(document.theme.buttonStyle),
      spacing: structuredClone(document.theme.spacingScale),
      cards: { ...base.theme.cards, radius: document.theme.radius },
    },
    blocks: document.blocks.map((block) => toCanonicalBlock(block, previousById.get(block.id))),
    settings: { ...base.settings, showBranding: document.footer.visible },
  };
}

export function cloneCollectionItem(item: BlockItem, newId: string): BlockItem {
  return { ...structuredClone(item), id: newId };
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
  [blocks[index], blocks[nextIndex]] = [blocks[nextIndex], blocks[index]];
  return { ...document, blocks };
}
