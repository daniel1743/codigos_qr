import type { PageDoc } from "../types/editor";

/** Card ids look like `${prefix}card.${itemId}`; itemId is "2" or "2-k3f9a" for duplicates. */
export function parseCardId(id: string): { prefix: string; itemId: string } | null {
  const i = id.lastIndexOf("card.");
  if (i < 0) return null;
  return { prefix: id.slice(0, i), itemId: id.slice(i + 5) };
}

export function baseIndex(itemId: string): number {
  const n = parseInt(itemId.split("-")[0], 10);
  return Number.isNaN(n) ? 0 : n;
}

export function cardOrder(doc: PageDoc, blockKey: string, count: number): string[] {
  const raw = doc.props[`block:${blockKey}`]?.order;
  return raw ? raw.split(",").filter(Boolean) : Array.from({ length: count }, (_, i) => String(i));
}

function withOrder(d: PageDoc, blockKey: string, order: string[]): PageDoc {
  const id = `block:${blockKey}`;
  return { ...d, props: { ...d.props, [id]: { ...d.props[id], order: order.join(",") } } };
}

export function moveCard(
  d: PageDoc,
  blockKey: string,
  count: number,
  itemId: string,
  dir: -1 | 1,
): PageDoc {
  const order = cardOrder(d, blockKey, count);
  const i = order.indexOf(itemId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return d;
  [order[i], order[j]] = [order[j], order[i]];
  return withOrder(d, blockKey, order);
}

export function deleteCard(d: PageDoc, blockKey: string, count: number, itemId: string): PageDoc {
  return withOrder(
    d,
    blockKey,
    cardOrder(d, blockKey, count).filter((x) => x !== itemId),
  );
}

function cloneKeys<T>(record: Record<string, T>, from: string, to: string): Record<string, T> {
  const next = { ...record };
  for (const key of Object.keys(record)) {
    if (key === from || key.startsWith(`${from}.`)) next[to + key.slice(from.length)] = record[key];
  }
  return next;
}

/** Duplicates a card with all of its edits (texts, styles, props) in one undoable step. */
export function duplicateCard(
  d: PageDoc,
  blockKey: string,
  count: number,
  prefix: string,
  itemId: string,
): PageDoc {
  const order = cardOrder(d, blockKey, count);
  const i = order.indexOf(itemId);
  if (i < 0) return d;
  const newItem = `${baseIndex(itemId)}-${Math.random().toString(36).slice(2, 7)}`;
  order.splice(i + 1, 0, newItem);
  const from = `${prefix}card.${itemId}`;
  const to = `${prefix}card.${newItem}`;
  const next: PageDoc = {
    ...d,
    texts: cloneKeys(d.texts, from, to),
    textStyles: cloneKeys(d.textStyles, from, to),
    props: cloneKeys(d.props, from, to),
    removed: cloneKeys(d.removed, from, to),
  };
  return withOrder(next, blockKey, order);
}
