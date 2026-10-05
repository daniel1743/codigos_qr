import type { BlockItem } from "../../types";
import { deepClone, uid } from "../../utils";

export const DEFAULT_PRODUCT_SEED: BlockItem = {
  id: "product-seed",
  title: "Nuevo producto",
  description: "Describe este producto.",
  price: "$0.00",
  imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
  ctaLabel: "Ver producto",
  ctaUrl: "#contacto",
};

/** Clone the complete product payload while assigning a document-local ID. */
export function cloneProductItem(source?: BlockItem): BlockItem {
  const clone = deepClone(source ?? DEFAULT_PRODUCT_SEED);
  clone.id = uid("prd");
  return clone;
}

/**
 * Hard ceiling for one bulk-add operation. Keeps an accidental click/paste from
 * exploding a single document (and its persistence payload).
 */
export const MAX_BULK_PRODUCTS = 50;

/** Clamp any requested bulk count into [1, MAX_BULK_PRODUCTS]. */
export function clampBulkCount(count: number): number {
  const numeric = Number.isFinite(count) ? Math.floor(count) : 1;
  return Math.max(1, Math.min(MAX_BULK_PRODUCTS, numeric));
}

/**
 * A safe, empty catalog product. Unlike `cloneProductItem`, it never copies a
 * real product's commercial data (title/price/image/cta), so bulk-adding N rows
 * cannot silently duplicate the last product's price or media.
 */
export const PRODUCT_PLACEHOLDER: BlockItem = {
  id: "product-placeholder",
  title: "Producto",
  description: "Descripción",
  price: "$0.00",
  imageUrl: "",
  ctaLabel: "Ver producto",
  ctaUrl: "#contacto",
};

/** Build a single empty catalog product with a fresh, document-local ID. */
export function createPlaceholderProduct(): BlockItem {
  return { ...PRODUCT_PLACEHOLDER, id: uid("prd") };
}

/** Build `count` empty catalog products (clamped to [1, MAX_BULK_PRODUCTS]). */
export function createPlaceholderProducts(count: number): BlockItem[] {
  return Array.from({ length: clampBulkCount(count) }, () => createPlaceholderProduct());
}

export interface AppendProductsResult {
  products: BlockItem[];
  addedIds: string[];
}

/**
 * Append `count` products to a product-grid collection.
 *
 * `placeholder: true` (the canonical catalog variant) appends safe, empty
 * products so a bulk add never duplicates real commercial data. `placeholder:
 * false` preserves the historical behavior of cloning the last card's full
 * payload for the other product-grid documents.
 */
export function appendProducts(
  products: readonly BlockItem[],
  count: number,
  options: { placeholder: boolean },
): AppendProductsResult {
  const safeCount = clampBulkCount(count);
  const additions = options.placeholder
    ? Array.from({ length: safeCount }, () => createPlaceholderProduct())
    : Array.from({ length: safeCount }, () => cloneProductItem(products[products.length - 1]));
  return {
    products: [...products, ...additions],
    addedIds: additions.map((product) => product.id),
  };
}

export type ProductGridItemAction = "duplicate" | "delete" | "up" | "down";

export interface ProductGridActionResult {
  products: BlockItem[];
  /** Item that should stay/again selected after the action; null clears it. */
  selectedItemId: string | null;
  /** False when the target item no longer exists (caller must not dispatch). */
  changed: boolean;
}

/**
 * Pure, document-local product-grid item operations shared by the editor.
 * Duplicate/delete/move never touch anything but the given product list.
 */
export function applyProductGridItemAction(
  products: readonly BlockItem[],
  itemId: string,
  action: ProductGridItemAction,
): ProductGridActionResult {
  const index = products.findIndex((product) => product.id === itemId);
  if (index < 0) return { products: [...products], selectedItemId: itemId, changed: false };
  const next = [...products];
  if (action === "delete") {
    next.splice(index, 1);
    return { products: next, selectedItemId: null, changed: true };
  }
  if (action === "up" && index > 0) {
    [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
  }
  if (action === "down" && index < next.length - 1) {
    [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
  }
  if (action === "duplicate") {
    const copy = cloneProductItem(next[index]);
    next.splice(index + 1, 0, copy);
    return { products: next, selectedItemId: copy.id, changed: true };
  }
  return { products: next, selectedItemId: itemId, changed: true };
}
