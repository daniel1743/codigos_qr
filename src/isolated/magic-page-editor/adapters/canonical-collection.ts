import type { BioTemplateConfig, BlockItem, TemplateBlock } from "../../../premium-template-studio/types";
import {
  appendProducts,
  applyProductGridItemAction,
  type ProductGridItemAction,
} from "../../../premium-template-studio/components/blocks/productGridCollection";

/**
 * C3.3-B — Canonical editorial write helpers.
 *
 * The full catalog is a canonical `BioTemplateConfig` whose `productGrid` block
 * stores every product in `content.products`. These pure helpers let the Magic
 * editor mutate that SAME document (image/title/description/price/CTA/URL and
 * add/duplicate/delete/reorder) by reusing the existing canonical product CRUD
 * (`productGridCollection`). No parallel model, no second persistence path and
 * no Power Editor dependency is introduced here.
 */

export type CollectionItemAction = ProductGridItemAction;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Structural, non-mutating clone of one object/array level. */
function cloneLevel(node: unknown): unknown {
  if (Array.isArray(node)) return [...node];
  if (isPlainObject(node)) return { ...node };
  return node;
}

/** Immutably set a dotted path (`a.b.3.c`) inside a plain config object. */
function setPathImmutable<T>(target: T, path: string, value: unknown): T {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length) return target;
  const root = cloneLevel(target) as Record<string, unknown>;
  let cursor = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i]!;
    const next = cloneLevel(cursor[key] ?? {});
    cursor[key] = next;
    cursor = next as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]!] = value;
  return root as T;
}

function replaceBlock(
  config: BioTemplateConfig,
  blockId: string,
  updater: (block: TemplateBlock) => TemplateBlock,
): BioTemplateConfig {
  let changed = false;
  const blocks = config.blocks.map((block) => {
    if (block.id !== blockId) return block;
    const next = updater(block);
    if (next !== block) changed = true;
    return next;
  });
  return changed ? { ...config, blocks } : config;
}

/**
 * Apply one inline edit coming from the canvas/toolbar.
 *
 * Paths look like `blocks.<blockId>.content.products.<idx>.title` or
 * `blocks.<blockId>.style.background`. A `blocks.<id>.<path>` segment is routed
 * to that block; any other path is applied to the config root.
 */
export function applyCanonicalInlinePatch(
  config: BioTemplateConfig,
  path: string,
  value: unknown,
): BioTemplateConfig {
  const match = /^blocks\.([^.]+)\.(.+)$/.exec(path);
  if (!match) return setPathImmutable(config, path, value);
  const [, blockId, rest] = match;
  return replaceBlock(config, blockId!, (block) => setPathImmutable(block, rest!, value));
}

export interface CollectionItemActionResult {
  config: BioTemplateConfig;
  changed: boolean;
  /** Item that should stay/again selected after the action; null clears it. */
  selectedItemId: string | null;
}

/** Duplicate/delete/move one product item, reusing the canonical CRUD. */
export function applyCanonicalCollectionItemAction(
  config: BioTemplateConfig,
  blockId: string,
  itemId: string,
  action: CollectionItemAction,
): CollectionItemActionResult {
  const block = config.blocks.find((candidate) => candidate.id === blockId);
  if (!block) return { config, changed: false, selectedItemId: null };
  const result = applyProductGridItemAction(block.content.products ?? [], itemId, action);
  if (!result.changed) return { config, changed: false, selectedItemId: result.selectedItemId };
  return {
    config: replaceBlock(config, blockId, (current) => ({
      ...current,
      content: { ...current.content, products: result.products },
    })),
    changed: true,
    selectedItemId: result.selectedItemId,
  };
}

export interface AppendCollectionItemsResult {
  config: BioTemplateConfig;
  addedIds: string[];
}

/**
 * Append `count` products to a product-grid block. `catalog-premium-card-v1`
 * (the canonical catalog) adds safe, empty placeholders so an add/bulk-add never
 * duplicates real commercial data — identical to the Power Editor behavior.
 */
export function appendCanonicalCollectionItems(
  config: BioTemplateConfig,
  blockId: string,
  count: number,
): AppendCollectionItemsResult {
  const block = config.blocks.find((candidate) => candidate.id === blockId);
  if (!block) return { config, addedIds: [] };
  const placeholder = block.variant === "catalog-premium-card-v1";
  const { products, addedIds } = appendProducts(block.content.products ?? [], count, { placeholder });
  return {
    config: replaceBlock(config, blockId, (current) => ({
      ...current,
      content: { ...current.content, products },
    })),
    addedIds,
  };
}

/** Patch a single product item (e.g. after an image upload/removal). */
export function updateCanonicalCollectionItem(
  config: BioTemplateConfig,
  blockId: string,
  itemId: string,
  updater: (item: BlockItem) => BlockItem,
): BioTemplateConfig {
  const block = config.blocks.find((candidate) => candidate.id === blockId);
  if (!block) return config;
  let changed = false;
  const products = (block.content.products ?? []).map((item) => {
    if (item.id !== itemId) return item;
    const next = updater(item);
    if (next !== item) changed = true;
    return next;
  });
  if (!changed) return config;
  return replaceBlock(config, blockId, (current) => ({
    ...current,
    content: { ...current.content, products },
  }));
}
