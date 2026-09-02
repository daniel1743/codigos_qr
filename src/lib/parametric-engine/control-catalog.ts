/**
 * V1.5 — editor control descriptor catalog.
 *
 * Pure serializable metadata describing what a future editor may expose.
 * No React, no UI components, no Tailwind.
 */

import type { ContentInventoryV1, ContentKey } from "./content-inventory";
import type { FutureCapabilityKey, FutureRendererCapabilitiesV1 } from "./future-capabilities";
import { resolveCapabilities } from "./capabilities";
import { resolveContentInventory } from "./content-inventory";
import { resolveFutureCapabilities } from "./future-capabilities";
import type { RendererCapabilitiesV1 } from "./types";
import { FAMILY_IDS, HERO_MODES } from "./types";

export type ControlType = "segmented" | "choice_cards" | "toggle" | "select";

export interface EngineControlDescriptorV1 {
  id: string;
  group: "header" | "links" | "layout" | "style" | "conversion" | "content";
  control_type: ControlType;
  allowed_values: string[];
  /** Current renderer capability required, when any. */
  required_renderer_capability: keyof RendererCapabilitiesV1 | null;
  /** Future renderer capability required, when any. */
  required_future_capability: FutureCapabilityKey | null;
  required_content: ContentKey[];
  lockable: boolean;
  advanced: boolean;
  description: string;
}

export const ENGINE_CONTROL_CATALOG: EngineControlDescriptorV1[] = [
  {
    id: "hero_mode",
    group: "header",
    control_type: "segmented",
    allowed_values: [...HERO_MODES],
    required_renderer_capability: "hero_banner",
    required_future_capability: null,
    required_content: [],
    lockable: true,
    advanced: false,
    description: "How the header presents avatar and banner.",
  },
  {
    id: "links_presentation",
    group: "links",
    control_type: "segmented",
    allowed_values: ["buttons", "cards", "mixed"],
    required_renderer_capability: null,
    required_future_capability: null,
    required_content: [],
    lockable: true,
    advanced: false,
    description: "How secondary links are presented.",
  },
  {
    id: "identity_alignment",
    group: "layout",
    control_type: "segmented",
    allowed_values: ["left", "center"],
    required_renderer_capability: null,
    required_future_capability: null,
    required_content: [],
    lockable: true,
    advanced: false,
    description: "Alignment of the identity block.",
  },
  {
    id: "density",
    group: "layout",
    control_type: "segmented",
    allowed_values: ["compact", "balanced", "spacious"],
    required_renderer_capability: null,
    required_future_capability: null,
    required_content: [],
    lockable: true,
    advanced: false,
    description: "Vertical rhythm and spacing.",
  },
  {
    id: "card_media_position",
    group: "links",
    control_type: "segmented",
    allowed_values: ["right", "bottom"],
    required_renderer_capability: "professional_cards",
    required_future_capability: null,
    required_content: [],
    lockable: true,
    advanced: true,
    description: "Where card media sits inside a professional card.",
  },
  {
    id: "visual_family",
    group: "style",
    control_type: "choice_cards",
    allowed_values: [...FAMILY_IDS],
    required_renderer_capability: null,
    required_future_capability: null,
    required_content: [],
    lockable: true,
    advanced: false,
    description: "Overall visual family strategy.",
  },
  {
    id: "services_block",
    group: "content",
    control_type: "toggle",
    allowed_values: ["on", "off"],
    required_renderer_capability: null,
    required_future_capability: "services_block",
    required_content: ["services"],
    lockable: false,
    advanced: true,
    description: "Future services section.",
  },
  {
    id: "gallery_block",
    group: "content",
    control_type: "toggle",
    allowed_values: ["on", "off"],
    required_renderer_capability: null,
    required_future_capability: "gallery_block",
    required_content: ["gallery"],
    lockable: false,
    advanced: true,
    description: "Future gallery section.",
  },
  {
    id: "testimonials_block",
    group: "content",
    control_type: "toggle",
    allowed_values: ["on", "off"],
    required_renderer_capability: null,
    required_future_capability: "testimonials_block",
    required_content: ["testimonials"],
    lockable: false,
    advanced: true,
    description: "Future testimonials section.",
  },
  {
    id: "booking_widget",
    group: "conversion",
    control_type: "toggle",
    allowed_values: ["on", "off"],
    required_renderer_capability: null,
    required_future_capability: "booking_widget",
    required_content: ["booking"],
    lockable: false,
    advanced: true,
    description: "Future inline booking surface.",
  },
  {
    id: "sticky_primary_cta",
    group: "conversion",
    control_type: "toggle",
    allowed_values: ["on", "off"],
    required_renderer_capability: null,
    required_future_capability: "sticky_primary_cta",
    required_content: [],
    lockable: false,
    advanced: true,
    description: "Future sticky mobile conversion bar.",
  },
];

export function getEngineControlCatalog(): EngineControlDescriptorV1[] {
  return ENGINE_CONTROL_CATALOG.map((d) => ({ ...d, allowed_values: [...d.allowed_values] }));
}

/** Only controls the renderer can honor AND the content can feed. */
export function getAvailableControls(
  capabilities: RendererCapabilitiesV1,
  content: ContentInventoryV1,
  future?: FutureRendererCapabilitiesV1,
): EngineControlDescriptorV1[] {
  // V1.5.1 — public helper: stored/runtime JSON is normalized, never trusted.
  const caps = resolveCapabilities(
    capabilities && typeof capabilities === "object" && !Array.isArray(capabilities)
      ? capabilities
      : undefined,
  );
  const inv = resolveContentInventory(
    content && typeof content === "object" && !Array.isArray(content) ? (content as never) : undefined,
  );
  const fut = resolveFutureCapabilities(
    future && typeof future === "object" && !Array.isArray(future) ? future : undefined,
  );
  return getEngineControlCatalog().filter((control) => {
    if (control.required_renderer_capability && !caps[control.required_renderer_capability]) {
      return false;
    }
    if (control.required_future_capability) {
      if (fut[control.required_future_capability] !== true) return false;
    }
    return control.required_content.every(
      (key) => (inv[key] as { available: boolean }).available === true,
    );
  });
}
