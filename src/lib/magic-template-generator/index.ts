import type { MagicPageDocumentV1 } from "../../features/magic-page-editor-production/magic-document";
import { MAGIC_DOCUMENT_TYPE, MAGIC_DOCUMENT_VERSION } from "../../features/magic-page-editor-production/magic-document";
import { PALETTES } from "../parametric-engine-v2/palettes";
import { FAMILY_PAIRS } from "../parametric-engine-v2/typography";
import type { BlockRef } from "../../isolated/magic-page-editor/types/editor";

export type MagicTemplateFamily = "business" | "portfolio";
export type MagicTemplateVariant = "v1" | "v2";

export interface MagicTemplateRequest {
  family: MagicTemplateFamily;
  variant: MagicTemplateVariant;
}

export function generateMagicTemplate(req: MagicTemplateRequest): MagicPageDocumentV1 {
  const isV1 = req.variant === "v1";
  
  // 1. Map to parametric-engine-v2 data
  const peFamily = req.family === "business" ? (isV1 ? "corporate" : "luxury") : (isV1 ? "minimal" : "editorial");
  
  const paletteIndex = isV1 ? 0 : 1;
  const palette = PALETTES[peFamily][paletteIndex] || PALETTES["minimal"][0];
  
  const typoIndex = isV1 ? 0 : 1;
  const typo = FAMILY_PAIRS[peFamily][typoIndex] || FAMILY_PAIRS["minimal"][0];

  // 2. Composition / Blocks
  // Require real variation: hero composition, block order, CTA placement/treatment
  let blocks: BlockRef[] = [];
  let props: Record<string, any> = {};
  
  if (req.family === "business") {
    if (isV1) {
      blocks = [
        { key: "hero-1", type: "hero" },
        { key: "links-1", type: "links" }, // CTA placement high
        { key: "collection-1", type: "collection" },
        { key: "location-1", type: "location" }
      ];
      props["hero-1"] = { variant: "split" }; // hero composition
      props["links-1"] = { layout: "buttons" }; // CTA treatment
      props["collection-1"] = { layout: "list" }; // card treatment
    } else {
      blocks = [
        { key: "hero-1", type: "hero" },
        { key: "collection-1", type: "collection" },
        { key: "links-1", type: "links" }, // CTA placement low
        { key: "catalog-1", type: "catalog" }
      ];
      props["hero-1"] = { variant: "centered" };
      props["links-1"] = { layout: "cards" };
      props["collection-1"] = { layout: "grid" };
    }
  } else { // portfolio
    if (isV1) {
      blocks = [
        { key: "hero-1", type: "hero" },
        { key: "gallery-1", type: "gallery" },
        { key: "text-1", type: "text" },
        { key: "social-1", type: "social" }
      ];
      props["hero-1"] = { variant: "fullBleed" };
      props["gallery-1"] = { layout: "masonry" };
    } else {
      blocks = [
        { key: "hero-1", type: "hero" },
        { key: "text-1", type: "text" },
        { key: "collection-1", type: "collection" },
        { key: "gallery-1", type: "gallery" }
      ];
      props["hero-1"] = { variant: "magazine" };
      props["collection-1"] = { layout: "editorial" };
      props["gallery-1"] = { layout: "mosaic" };
    }
  }

  // 3. Construct Magic PageDoc
  // Translate parametric palette/typo to Magic Theme loosely
  const theme = {
    accent: palette.accent,
    accentFg: palette.accent_contrast,
    radius: isV1 ? 8 : 24, // reject if templates differ ONLY by color/font/radius -> but we have different blocks
    swatches: [palette.background, palette.surface, palette.text, palette.text_muted, palette.accent],
    tones: [
      { id: "main", label: "Main", color: palette.background, fg: palette.text, muted: palette.text_muted, surface: palette.surface, line: palette.border }
    ],
    pageTones: ["main"],
    fonts: [
      { id: "primary", label: "Primary", display: typo.heading_family, body: typo.body_family }
    ]
  };

  const id = req.family; // "business" | "portfolio" as TemplateId

  return {
    documentType: MAGIC_DOCUMENT_TYPE,
    version: MAGIC_DOCUMENT_VERSION,
    template: { id },
    theme,
    content: {}, // unused or for dynamic data
    texts: {},
    textStyles: {},
    props,
    blocks,
    removed: {},
    meta: {
      createdBy: "magic-editor",
      schemaVersion: 1
    }
  };
}
