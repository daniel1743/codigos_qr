import type { BlockRef, PageDoc } from "../types/editor";

/**
 * Block lock contract.
 *
 * A block is locked through the prop the inspector already writes:
 * `props["block:<key>"].locked === "true"`. It stays a plain string prop on
 * purpose - the Magic document stores every prop as a string, so locking rides
 * the payload that already persists and hydrates, with no document-format
 * change and no legacy document rewritten.
 *
 * Before this module the flag was only painted (the toolbar showed a closed
 * padlock and media drag stopped). Everything below makes it an actual editing
 * safeguard enforced by the editor actions, not by a disabled button.
 */

export const BLOCK_LOCK_PROP = "locked";

/** Props key of the block container itself (`block:hero`). */
export function blockPropsKey(blockKey: string): string {
  return `block:${blockKey}`;
}

/** True when the block carries the locked flag. */
export function isBlockLocked(doc: PageDoc, blockKey: string): boolean {
  return doc.props[blockPropsKey(blockKey)]?.[BLOCK_LOCK_PROP] === "true";
}

/**
 * The block that owns an element id, or `undefined` for page-level ids.
 *
 * Three shapes exist in the Magic document and all three are handled:
 *   `block:hero`      - the block container itself
 *   `hero.name`       - an element of a block whose key equals its type
 *   `hero-4f2a/name`  - an element of a duplicated block (kept namespaced)
 */
export function blockKeyForElementId(doc: PageDoc, id: string): string | undefined {
  if (id.startsWith("block:")) {
    const key = id.slice("block:".length).split("/")[0];
    return doc.blocks.some((block) => block.key === key) ? key : undefined;
  }
  let owner: string | undefined;
  let ownerLength = -1;
  for (const block of doc.blocks) {
    const namespace = namespaceFor(block);
    if (id.startsWith(namespace) && namespace.length > ownerLength) {
      owner = block.key;
      ownerLength = namespace.length;
    }
  }
  return owner;
}

function namespaceFor(block: BlockRef): string {
  // Mirrors `blockPrefix`: a block whose key equals its type has no namespace.
  return block.key === block.type ? `${block.type}.` : `${block.key}/`;
}

/**
 * True when the element belongs to a locked block.
 *
 * `propKey` is the single escape hatch: writing `locked` on the block container
 * is always allowed, otherwise the Layers panel and the inspector could never
 * unlock anything (and a locked block would be locked forever).
 */
export function isElementLocked(doc: PageDoc, id: string, propKey?: string): boolean {
  const blockKey = blockKeyForElementId(doc, id);
  if (!blockKey) return false;
  if (propKey === BLOCK_LOCK_PROP && id === blockPropsKey(blockKey)) return false;
  return isBlockLocked(doc, blockKey);
}

/** Label shown when an action is refused because the block is locked. */
export const LOCKED_BLOCK_MESSAGE = "Bloque protegido";
export const LOCKED_BLOCK_HINT = "Desbloquealo en Capas para editarlo.";
