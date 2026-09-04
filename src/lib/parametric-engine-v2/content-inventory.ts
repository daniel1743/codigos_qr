/**
 * V1.5 — ContentInventoryV1.
 *
 * The engine must know WHAT CONTENT EXISTS without becoming the content
 * database. Availability + counts only; never user content itself.
 */

export interface ContentSlot {
  available: boolean;
  count: number;
}

export interface ContentInventoryV1 {
  links: ContentSlot;
  services: ContentSlot & { has_prices: boolean };
  portfolio: ContentSlot;
  gallery: ContentSlot;
  before_after: ContentSlot;
  testimonials: ContentSlot;
  faq: ContentSlot;
  locations: ContentSlot;
  service_areas: ContentSlot;
  hours: { available: boolean };
  pricing: ContentSlot;
  products: ContentSlot;
  video: { available: boolean };
  trust_facts: ContentSlot;
  booking: { available: boolean };
  lead_form: { available: boolean };
}

const slot = (available = false, count = 0): ContentSlot => ({
  available: available && count >= 0,
  count: available ? Math.max(count, 0) : 0,
});

export const EMPTY_CONTENT_INVENTORY: ContentInventoryV1 = {
  links: slot(),
  services: { ...slot(), has_prices: false },
  portfolio: slot(),
  gallery: slot(),
  before_after: slot(),
  testimonials: slot(),
  faq: slot(),
  locations: slot(),
  service_areas: slot(),
  hours: { available: false },
  pricing: slot(),
  products: slot(),
  video: { available: false },
  trust_facts: slot(),
  booking: { available: false },
  lead_form: { available: false },
};

/** V1.5.1 — hard validation bound for any content count. */
export const MAX_CONTENT_COUNT = 1000;

/** Runtime-safe count: NaN/Infinity/negative/fractional never leak through. */
function safeSlotCount(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const truncated = Math.trunc(value);
  if (truncated < 0) return 0;
  return Math.min(truncated, MAX_CONTENT_COUNT);
}

function mergeSlot(base: ContentSlot, patch?: Partial<ContentSlot>): ContentSlot {
  if (!patch || typeof patch !== "object") return { ...base };
  const count = safeSlotCount(patch.count, base.count);
  const available = typeof patch.available === "boolean" ? patch.available : base.available;
  // Availability and count must stay coherent: no zero-count available slot.
  return { available: available && count > 0, count: available ? count : 0 };
}

function safeFlag(value: unknown): boolean {
  return value === true;
}

/** Normalizes any partial inventory into a complete, coherent inventory. */
export function resolveContentInventory(
  patch?: ContentInventoryPatch,
): ContentInventoryV1 {
  const b = EMPTY_CONTENT_INVENTORY;
  // Hostile callers may pass null/arrays/primitives despite the type.
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return structuredClone(b);
  return {
    links: mergeSlot(b.links, patch.links),
    services: {
      ...mergeSlot(b.services, patch.services),
      has_prices: safeFlag(patch.services?.has_prices),
    },
    portfolio: mergeSlot(b.portfolio, patch.portfolio),
    gallery: mergeSlot(b.gallery, patch.gallery),
    before_after: mergeSlot(b.before_after, patch.before_after),
    testimonials: mergeSlot(b.testimonials, patch.testimonials),
    faq: mergeSlot(b.faq, patch.faq),
    locations: mergeSlot(b.locations, patch.locations),
    service_areas: mergeSlot(b.service_areas, patch.service_areas),
    hours: { available: safeFlag(patch.hours?.available) },
    pricing: mergeSlot(b.pricing, patch.pricing),
    products: mergeSlot(b.products, patch.products),
    video: { available: safeFlag(patch.video?.available) },
    trust_facts: mergeSlot(b.trust_facts, patch.trust_facts),
    booking: { available: safeFlag(patch.booking?.available) },
    lead_form: { available: safeFlag(patch.lead_form?.available) },
  };
}

export type ContentKey = keyof ContentInventoryV1;

/** Stable runtime list of every content key (used by runtime validation). */
export const CONTENT_KEYS = Object.keys(EMPTY_CONTENT_INVENTORY) as ContentKey[];

/** Partial-friendly input shape: every slot may be partially specified. */
export type ContentInventoryPatch = {
  [K in ContentKey]?: Partial<ContentInventoryV1[K]>;
};

export function hasContent(inventory: ContentInventoryV1, key: ContentKey): boolean {
  const value = inventory[key] as { available: boolean } | undefined;
  return value?.available === true;
}

/** Countable slots expose a numeric count; boolean-only slots return 0. */
export function contentCount(inventory: ContentInventoryV1, key: ContentKey): number {
  const value = inventory[key] as { count?: number };
  return typeof value?.count === "number" ? value.count : 0;
}

