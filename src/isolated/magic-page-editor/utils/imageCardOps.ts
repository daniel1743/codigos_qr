import type { PageDoc } from "../types/editor";

/**
 * Image-cards block model (Magic Page Editor).
 *
 * The block is intentionally tiny: a list of slots, each slot being one
 * "picture card" that owns its own image, link and corner shape. Nothing here
 * touches the card-family engine (`CardBody` / `FamilyCard`).
 *
 * Storage (all inside the existing `doc.props` bags, so it persists with no
 * schema change):
 *   - `block:<blockKey>`      → { items: "0,1" }  (order + membership, max 4)
 *   - `<blockKey>/item.<slot>`→ { src, href, newTab, shape, alt? }
 */
export const IMAGE_CARDS_MAX = 4;
export const IMAGE_CARDS_MIN = 1;
export const IMAGE_CARDS_DEFAULT_ITEMS = ["0", "1"] as const;

export type ImageCardShape = "square" | "rounded" | "extra";

/** Corner radius (px) for every selectable card shape. */
export const IMAGE_CARD_RADIUS: Record<ImageCardShape, number> = {
  square: 2,
  rounded: 18,
  extra: 34,
};

export function resolveImageCardShape(raw: string | undefined): ImageCardShape {
  return raw === "square" || raw === "rounded" || raw === "extra" ? raw : "rounded";
}

export function imageCardsScope(blockKey: string): string {
  return `block:${blockKey}`;
}

export function imageCardId(blockKey: string, slot: string): string {
  return `${blockKey}/item.${slot}`;
}

/** Extracts the slot id from an element id, or null when it is not a card of this block. */
export function parseImageCardSlot(blockKey: string, id: string): string | null {
  const prefix = `${blockKey}/item.`;
  return id.startsWith(prefix) && id.length > prefix.length ? id.slice(prefix.length) : null;
}

export function imageCardsOrder(doc: PageDoc, blockKey: string): string[] {
  const raw = doc.props[imageCardsScope(blockKey)]?.["items"];
  if (raw === undefined) return [...IMAGE_CARDS_DEFAULT_ITEMS];
  return raw.split(",").map((value) => value.trim()).filter(Boolean);
}

export function canAddImageCard(doc: PageDoc, blockKey: string): boolean {
  return imageCardsOrder(doc, blockKey).length < IMAGE_CARDS_MAX;
}

export function canDeleteImageCard(doc: PageDoc, blockKey: string): boolean {
  return imageCardsOrder(doc, blockKey).length > IMAGE_CARDS_MIN;
}

function baseIndex(slot: string): number {
  const parsed = parseInt(slot.split("-")[0] ?? "", 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 7);
}

function withOrder(doc: PageDoc, blockKey: string, order: string[]): PageDoc {
  const id = imageCardsScope(blockKey);
  return { ...doc, props: { ...doc.props, [id]: { ...doc.props[id], items: order.join(",") } } };
}

function cloneKeys<T>(record: Record<string, T>, from: string, to: string): Record<string, T> {
  const next = { ...record };
  for (const key of Object.keys(record)) {
    if (key === from || key.startsWith(`${from}.`)) next[to + key.slice(from.length)] = record[key]!;
  }
  return next;
}

function dropKeys(record: Record<string, unknown>, scope: string): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    if (key !== scope && !key.startsWith(`${scope}.`)) next[key] = record[key];
  }
  return next;
}

/** Appends a fresh card. No-op (returns the same doc) once the maximum of 4 is reached. */
export function addImageCard(doc: PageDoc, blockKey: string): PageDoc {
  const order = imageCardsOrder(doc, blockKey);
  if (order.length >= IMAGE_CARDS_MAX) return doc;
  return withOrder(doc, blockKey, [...order, `${order.length}-${uid()}`]);
}

/** Duplicates a card (with its image, link and shape) right after the original. */
export function duplicateImageCard(doc: PageDoc, blockKey: string, slot: string): PageDoc {
  const order = imageCardsOrder(doc, blockKey);
  if (order.length >= IMAGE_CARDS_MAX) return doc;
  const index = order.indexOf(slot);
  if (index < 0) return doc;
  const newSlot = `${baseIndex(slot)}-${uid()}`;
  const from = imageCardId(blockKey, slot);
  const to = imageCardId(blockKey, newSlot);
  const next: PageDoc = {
    ...doc,
    texts: cloneKeys(doc.texts, from, to),
    textStyles: cloneKeys(doc.textStyles, from, to),
    props: cloneKeys(doc.props, from, to),
    removed: cloneKeys(doc.removed, from, to),
  };
  const nextOrder = [...order];
  nextOrder.splice(index + 1, 0, newSlot);
  return withOrder(next, blockKey, nextOrder);
}

/** Removes a card and its stored props. Keeps at least one card in the block. */
export function deleteImageCard(doc: PageDoc, blockKey: string, slot: string): PageDoc {
  const order = imageCardsOrder(doc, blockKey);
  if (order.length <= IMAGE_CARDS_MIN) return doc;
  if (!order.includes(slot)) return doc;
  const scope = imageCardId(blockKey, slot);
  const next: PageDoc = {
    ...doc,
    texts: dropKeys(doc.texts, scope) as PageDoc["texts"],
    textStyles: dropKeys(doc.textStyles, scope) as PageDoc["textStyles"],
    props: dropKeys(doc.props, scope) as PageDoc["props"],
    removed: dropKeys(doc.removed, scope) as PageDoc["removed"],
  };
  return withOrder(next, blockKey, order.filter((entry) => entry !== slot));
}

/** Moves a card one position left (-1) or right (1) inside the grid. */
export function moveImageCard(doc: PageDoc, blockKey: string, slot: string, dir: -1 | 1): PageDoc {
  const order = imageCardsOrder(doc, blockKey);
  const i = order.indexOf(slot);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return doc;
  const nextOrder = [...order];
  const tmp = nextOrder[i]!;
  nextOrder[i] = nextOrder[j]!;
  nextOrder[j] = tmp;
  return withOrder(doc, blockKey, nextOrder);
}
