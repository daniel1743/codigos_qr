import type { BioTemplateConfig, TemplateBlock } from "../types";
import { buildTemplate } from "../engine/TemplateBuilder";
import { getLayout } from "../constants/layouts";
import { getTheme } from "../constants/themes";

/**
 * DEV/QA-ONLY selection fixture for Phase 4 SELECT-01..08.
 *
 * This file is pure data: it builds a deterministic, valid `BioTemplateConfig`
 * using only block types registered in the current `BlockRegistry`. It has no
 * side effects, writes nothing, and is never referenced by production code.
 *
 * It exists so manual verification of selection → Canvas autofocus has a
 * trustworthy document with multiple distinct blocks distributed vertically:
 *
 *   top    → hero (PHASE 4 QA — TOP)
 *   upper  → heading + text + image
 *   middle → CTA + button group (PHASE 4 QA — MIDDLE / BUTTON)
 *   lower  → text + image
 *   bottom → contact (PHASE 4 QA — BOTTOM)
 */

/** Stable block ids used by the fixture (also valid `data-block-id` selectors). */
export const PHASE4_QA_BLOCK_IDS = [
  "qa-phase4-top",
  "qa-phase4-heading-a",
  "qa-phase4-text-a",
  "qa-phase4-media-a",
  "qa-phase4-cta",
  "qa-phase4-buttons",
  "qa-phase4-middle",
  "qa-phase4-text-b",
  "qa-phase4-media-b",
  "qa-phase4-bottom",
] as const;

const QA_IMAGE_A =
  "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=1200&q=70";
const QA_IMAGE_B =
  "https://images.unsplash.com/photo-1517840901100-8179e982acb7?auto=format&fit=crop&w=1200&q=70";

function qaBlock(
  id: string,
  type: TemplateBlock["type"],
  variant: string,
  content: TemplateBlock["content"],
  layout: TemplateBlock["layout"] = {},
): TemplateBlock {
  return {
    id,
    type,
    variant,
    content,
    style: {},
    layout: { width: "content", align: "center", span: 2, ...layout },
    visibility: { desktop: true, tablet: true, mobile: true },
    interaction: { newTab: true },
  };
}

export function createPhase4SelectionQaConfig(): BioTemplateConfig {
  return buildTemplate({
    pageInstanceId: "qa-phase4-selection",
    templateDefinitionId: "qa-phase4-selection",
    name: "Phase 4 Selection QA",
    category: "Personal",
    premium: false,
    theme: getTheme("aurora"),
    layout: getLayout("centered"),
    profile: {
      name: "QA Tester",
      username: "qa-phase4",
      role: "Selection Autofocus",
      company: "Cripqer QA",
      description: "Deterministic fixture for verifying Phase 4 selection autofocus.",
    },
    blocks: [
      qaBlock("qa-phase4-top", "hero", "centered", {
        eyebrow: "PHASE 4 QA",
        title: "PHASE 4 QA — TOP",
        subtitle: "Selectable hero block near the top of the page.",
        description: "This block should already be visible on first load.",
        primaryCTA: { label: "Top CTA", url: "https://example.com" },
      }),
      qaBlock("qa-phase4-heading-a", "heading", "default", {
        title: "PHASE 4 QA — HEADING A",
        subtitle: "First heading target",
      }),
      qaBlock("qa-phase4-text-a", "text", "default", {
        body:
          "PHASE 4 QA — TEXT A. This paragraph adds genuine vertical height so later blocks " +
          "fall below the Canvas viewport. Selecting blocks above and below this one exercises " +
          "the autofocus recovery. It is deterministic test content, not production design.",
      }),
      qaBlock(
        "qa-phase4-media-a",
        "image",
        "framed",
        { imageUrl: QA_IMAGE_A, alt: "PHASE 4 QA — MEDIA A" },
        { aspect: "video" },
      ),
      qaBlock("qa-phase4-cta", "cta", "panel", {
        title: "PHASE 4 QA — BUTTON",
        body: "A call to action panel used as a selectable target.",
        label: "Click me",
        url: "https://example.com",
      }),
      qaBlock("qa-phase4-buttons", "buttonGroup", "row", {
        items: [
          { id: "qa-btn-1", label: "QA Button 1", url: "https://example.com" },
          { id: "qa-btn-2", label: "QA Button 2", url: "https://example.com" },
        ],
      }),
      qaBlock("qa-phase4-middle", "heading", "default", {
        title: "PHASE 4 QA — MIDDLE",
        subtitle: "A selectable target around the vertical middle.",
      }),
      qaBlock("qa-phase4-text-b", "text", "default", {
        body:
          "PHASE 4 QA — TEXT B. More content to push the bottom targets off-screen. " +
          "Rapidly selecting between TOP, MIDDLE and BOTTOM should scroll the Canvas with " +
          "minimal, non-chaotic movement at the current zoom level.",
      }),
      qaBlock(
        "qa-phase4-media-b",
        "image",
        "plain",
        { imageUrl: QA_IMAGE_B, alt: "PHASE 4 QA — MEDIA B" },
        { aspect: "video" },
      ),
      qaBlock("qa-phase4-bottom", "contact", "card", {
        title: "PHASE 4 QA — BOTTOM",
        email: "qa@example.com",
        phone: "+1 555 0100",
        address: "Cripqer QA, Barcelona",
      }),
    ],
  });
}
