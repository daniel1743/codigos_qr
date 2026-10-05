import type { PageDoc } from "../types/editor";

/**
 * "Reseñas" block model (Magic Page Editor).
 *
 * Deliberately tiny and self-contained, exactly like `imageCardOps`: a list of
 * slots where each slot owns an optional avatar, a name, a testimonial and a
 * 1–5 rating. Nothing here touches the card-family engine (`CardBody` /
 * `FamilyCard`) nor the legacy testimonial cards.
 *
 * Storage (all inside the existing `doc.props` bags, so it persists with no
 * schema change):
 *   - `block:<blockKey>`        → { items: "0,1" }  (order + membership, max 6)
 *   - `<blockKey>/review.<slot>`→ { avatar?, name?, text?, rating? }
 */
export const REVIEWS_MAX = 6;
export const REVIEWS_MIN = 1;
export const REVIEWS_DEFAULT_ITEMS = ["0", "1"] as const;

/** The five selectable ratings, from one star to five. */
export const REVIEW_RATINGS = [1, 2, 3, 4, 5] as const;

export interface ReviewDefaults {
  name: string;
  text: string;
  rating: number;
}

/**
 * Sample content a fresh slot shows until the author replaces it. Indexed by
 * position so a brand-new block always renders two meaningful reviews (the
 * "2 reseñas iniciales" contract) without mutating the document on render.
 */
export const REVIEWS_DEFAULT_CONTENT: ReviewDefaults[] = [
  { name: "María González", text: "Un servicio impecable y muy profesional. Repetiré sin dudarlo.", rating: 5 },
  { name: "Carlos Ramírez", text: "Atención cercana y resultados que superaron lo que esperaba.", rating: 5 },
  { name: "Lucía Fernández", text: "Rápido, claro y muy fácil de recomendar a cualquiera.", rating: 4 },
  { name: "Diego Santos", text: "Gran calidad y un trato excelente de principio a fin.", rating: 5 },
  { name: "Elena Martín", text: "Me encantó el resultado y lo atentos que fueron en todo momento.", rating: 5 },
  { name: "Javier Ortega", text: "Justo lo que buscaba, con un acabado muy cuidado.", rating: 4 },
];

export function defaultReviewContent(index: number): ReviewDefaults {
  const safe = index >= 0 ? index : 0;
  return REVIEWS_DEFAULT_CONTENT[safe % REVIEWS_DEFAULT_CONTENT.length]!;
}

export function reviewsScope(blockKey: string): string {
  return `block:${blockKey}`;
}

export function reviewId(blockKey: string, slot: string): string {
  return `${blockKey}/review.${slot}`;
}

/** Extracts the slot id from an element id, or null when it is not a review of this block. */
export function parseReviewSlot(blockKey: string, id: string): string | null {
  const prefix = `${blockKey}/review.`;
  return id.startsWith(prefix) && id.length > prefix.length ? id.slice(prefix.length) : null;
}

/** Clamps any stored rating into the 1–5 range (defaults to 5 when missing/invalid). */
export function resolveReviewRating(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (Number.isNaN(parsed)) return 5;
  return Math.min(5, Math.max(1, parsed));
}

export function reviewsOrder(doc: PageDoc, blockKey: string): string[] {
  const raw = doc.props[reviewsScope(blockKey)]?.["items"];
  if (raw === undefined) return [...REVIEWS_DEFAULT_ITEMS];
  return raw.split(",").map((value) => value.trim()).filter(Boolean);
}

export function canAddReview(doc: PageDoc, blockKey: string): boolean {
  return reviewsOrder(doc, blockKey).length < REVIEWS_MAX;
}

export function canDeleteReview(doc: PageDoc, blockKey: string): boolean {
  return reviewsOrder(doc, blockKey).length > REVIEWS_MIN;
}

export interface ReviewView {
  id: string;
  slot: string;
  index: number;
  avatar: string;
  name: string;
  text: string;
  rating: number;
}

/**
 * The effective review shown for a slot: the persisted value when present,
 * otherwise the sample default for that position. Shared by the renderer and
 * the editor panel so both always agree.
 */
export function readReview(doc: PageDoc, blockKey: string, slot: string, index: number): ReviewView {
  const fallback = defaultReviewContent(index);
  const p = doc.props[reviewId(blockKey, slot)] ?? {};
  return {
    id: reviewId(blockKey, slot),
    slot,
    index,
    avatar: p["avatar"] ?? "",
    name: p["name"] ?? fallback.name,
    text: p["text"] ?? fallback.text,
    rating: resolveReviewRating(p["rating"] ?? String(fallback.rating)),
  };
}

function baseIndex(slot: string): number {
  const parsed = parseInt(slot.split("-")[0] ?? "", 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 7);
}

function withOrder(doc: PageDoc, blockKey: string, order: string[]): PageDoc {
  const id = reviewsScope(blockKey);
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

/** Appends a fresh review. No-op (returns the same doc) once the maximum of 6 is reached. */
export function addReview(doc: PageDoc, blockKey: string): PageDoc {
  const order = reviewsOrder(doc, blockKey);
  if (order.length >= REVIEWS_MAX) return doc;
  return withOrder(doc, blockKey, [...order, `${order.length}-${uid()}`]);
}

/** Duplicates a review (with its avatar, name, testimonial and rating) right after the original. */
export function duplicateReview(doc: PageDoc, blockKey: string, slot: string): PageDoc {
  const order = reviewsOrder(doc, blockKey);
  if (order.length >= REVIEWS_MAX) return doc;
  const index = order.indexOf(slot);
  if (index < 0) return doc;
  const newSlot = `${baseIndex(slot)}-${uid()}`;
  const from = reviewId(blockKey, slot);
  const to = reviewId(blockKey, newSlot);
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

/** Removes a review and its stored data. Keeps at least one review in the block. */
export function deleteReview(doc: PageDoc, blockKey: string, slot: string): PageDoc {
  const order = reviewsOrder(doc, blockKey);
  if (order.length <= REVIEWS_MIN) return doc;
  if (!order.includes(slot)) return doc;
  const scope = reviewId(blockKey, slot);
  const next: PageDoc = {
    ...doc,
    texts: dropKeys(doc.texts, scope) as PageDoc["texts"],
    textStyles: dropKeys(doc.textStyles, scope) as PageDoc["textStyles"],
    props: dropKeys(doc.props, scope) as PageDoc["props"],
    removed: dropKeys(doc.removed, scope) as PageDoc["removed"],
  };
  return withOrder(next, blockKey, order.filter((entry) => entry !== slot));
}

/** Moves a review one position left (-1) or right (1). */
export function moveReview(doc: PageDoc, blockKey: string, slot: string, dir: -1 | 1): PageDoc {
  const order = reviewsOrder(doc, blockKey);
  const i = order.indexOf(slot);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return doc;
  const nextOrder = [...order];
  const tmp = nextOrder[i]!;
  nextOrder[i] = nextOrder[j]!;
  nextOrder[j] = tmp;
  return withOrder(doc, blockKey, nextOrder);
}
