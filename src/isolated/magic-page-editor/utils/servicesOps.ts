import type { PageDoc } from "../types/editor";

/**
 * "Servicios" block model (Magic Page Editor).
 *
 * A price list: rows of title / detail / price, **with no image**. That is the
 * whole reason it is its own family rather than an extension of `collection` —
 * `CardItem.image` is required and every one of `FamilyCard`'s layouts renders a
 * media slot, so carrying a no-image row there would mean making the image
 * optional across ~15 layouts and inventing media that does not exist.
 *
 * Deliberately tiny and self-contained, exactly like `reviewsOps` and
 * `imageCardOps`. Nothing here touches the card-family engine.
 *
 * Storage — all inside the existing bags, so it persists with no schema change:
 *   - `block:<blockKey>`            → { items: "0,1", rowTreatment? }
 *   - `texts[<blockKey>/service.<slot>.title|.detail|.price]`
 *   - `textStyles[...]` for the same three keys
 *
 * Text lives in `texts`/`textStyles` rather than a props bag because these are
 * inline-editable strings that want typography controls — the same mechanism the
 * template headings already use.
 */
export const SERVICES_MAX = 8;
export const SERVICES_MIN = 1;
export const SERVICES_DEFAULT_ITEMS = ["0", "1", "2"] as const;

export interface ServiceDefaults {
  title: string;
  detail: string;
  price: string;
}

/**
 * Sample content a fresh slot shows until the author replaces it. Indexed by
 * position so a brand-new block renders a meaningful list without mutating the
 * document during render.
 */
export const SERVICES_DEFAULT_CONTENT: ServiceDefaults[] = [
  { title: "Consulta general", detail: "Revisión completa y plan de cuidado", price: "Desde $25" },
  { title: "Servicio a domicilio", detail: "Vamos a donde estés", price: "Desde $40" },
  { title: "Seguimiento", detail: "Control y ajustes posteriores", price: "Desde $15" },
  { title: "Asesoría", detail: "Una hora para resolver dudas", price: "Desde $30" },
  { title: "Plan mensual", detail: "Acompañamiento continuo", price: "Desde $90" },
  { title: "Urgencias", detail: "Atención el mismo día", price: "Desde $50" },
  { title: "Instalación", detail: "Puesta en marcha incluida", price: "Desde $60" },
  { title: "Mantenimiento", detail: "Revisión periódica programada", price: "Desde $35" },
];

export function defaultServiceContent(index: number): ServiceDefaults {
  const safe = index >= 0 ? index : 0;
  return SERVICES_DEFAULT_CONTENT[safe % SERVICES_DEFAULT_CONTENT.length]!;
}

export function servicesScope(blockKey: string): string {
  return `block:${blockKey}`;
}

export function serviceId(blockKey: string, slot: string): string {
  return `${blockKey}/service.${slot}`;
}

/** The stored text key for one field of one row. */
export type ServiceField = "title" | "detail" | "price";

export function serviceFieldId(blockKey: string, slot: string, field: ServiceField): string {
  return `${serviceId(blockKey, slot)}.${field}`;
}

/** Extracts the slot id from an element id, or null when it is not a service row of this block. */
export function parseServiceSlot(blockKey: string, id: string): string | null {
  const prefix = `${blockKey}/service.`;
  if (!id.startsWith(prefix)) return null;
  const rest = id.slice(prefix.length);
  const dot = rest.indexOf(".");
  const slot = dot < 0 ? rest : rest.slice(0, dot);
  return slot.length > 0 ? slot : null;
}

export function servicesOrder(doc: PageDoc, blockKey: string): string[] {
  const raw = doc.props[servicesScope(blockKey)]?.["items"];
  if (raw === undefined) return [...SERVICES_DEFAULT_ITEMS];
  return raw.split(",").map((value) => value.trim()).filter(Boolean);
}

export function canAddService(doc: PageDoc, blockKey: string): boolean {
  return servicesOrder(doc, blockKey).length < SERVICES_MAX;
}

export function canDeleteService(doc: PageDoc, blockKey: string): boolean {
  return servicesOrder(doc, blockKey).length > SERVICES_MIN;
}

export interface ServiceView {
  id: string;
  slot: string;
  index: number;
  title: string;
  detail: string;
  price: string;
}

/**
 * The effective row shown for a slot: the persisted text when present, otherwise
 * the sample default for that position. Shared by the renderer and the editor
 * panel so both always agree.
 */
export function readService(
  doc: PageDoc,
  blockKey: string,
  slot: string,
  index: number,
): ServiceView {
  const fallback = defaultServiceContent(index);
  return {
    id: serviceId(blockKey, slot),
    slot,
    index,
    title: doc.texts[serviceFieldId(blockKey, slot, "title")] ?? fallback.title,
    detail: doc.texts[serviceFieldId(blockKey, slot, "detail")] ?? fallback.detail,
    price: doc.texts[serviceFieldId(blockKey, slot, "price")] ?? fallback.price,
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
  const id = servicesScope(blockKey);
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

/** Appends a fresh row. No-op once the maximum is reached. */
export function addService(doc: PageDoc, blockKey: string): PageDoc {
  const order = servicesOrder(doc, blockKey);
  if (order.length >= SERVICES_MAX) return doc;
  return withOrder(doc, blockKey, [...order, `${order.length}-${uid()}`]);
}

/** Duplicates a row, with its text, right after the original. */
export function duplicateService(doc: PageDoc, blockKey: string, slot: string): PageDoc {
  const order = servicesOrder(doc, blockKey);
  if (order.length >= SERVICES_MAX) return doc;
  const index = order.indexOf(slot);
  if (index < 0) return doc;
  const newSlot = `${baseIndex(slot)}-${uid()}`;
  const from = serviceId(blockKey, slot);
  const to = serviceId(blockKey, newSlot);
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

/** Removes a row and its stored text. Keeps at least one row in the block. */
export function deleteService(doc: PageDoc, blockKey: string, slot: string): PageDoc {
  const order = servicesOrder(doc, blockKey);
  if (order.length <= SERVICES_MIN) return doc;
  if (!order.includes(slot)) return doc;
  const scope = serviceId(blockKey, slot);
  const next: PageDoc = {
    ...doc,
    texts: dropKeys(doc.texts, scope) as PageDoc["texts"],
    textStyles: dropKeys(doc.textStyles, scope) as PageDoc["textStyles"],
    props: dropKeys(doc.props, scope) as PageDoc["props"],
    removed: dropKeys(doc.removed, scope) as PageDoc["removed"],
  };
  return withOrder(next, blockKey, order.filter((entry) => entry !== slot));
}

/** Moves a row one position up (-1) or down (1). */
export function moveService(doc: PageDoc, blockKey: string, slot: string, dir: -1 | 1): PageDoc {
  const order = servicesOrder(doc, blockKey);
  const i = order.indexOf(slot);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return doc;
  const nextOrder = [...order];
  const tmp = nextOrder[i]!;
  nextOrder[i] = nextOrder[j]!;
  nextOrder[j] = tmp;
  return withOrder(doc, blockKey, nextOrder);
}
