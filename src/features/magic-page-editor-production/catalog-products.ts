import { readCanonicalPageEnvelope } from "../../lib/canonical-page";
import type { CatalogProduct } from "./catalog-link";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

/**
 * The full catalog persists as a canonical child-page envelope whose
 * `productGrid` block holds every stored product. This reads that product list
 * without importing the Power Editor or the catalog editor UI.
 */
function catalogBlocks(value: unknown): unknown[] | null {
  const envelope = readCanonicalPageEnvelope(value);
  const config = envelope ? envelope.editorConfig : value;
  if (!isRecord(config) || !Array.isArray(config.blocks)) return null;
  return config.blocks;
}

function toCatalogProduct(value: unknown): CatalogProduct | null {
  if (!isRecord(value)) return null;
  const id = optionalString(value.id);
  if (!id) return null;
  return {
    id,
    title: optionalString(value.title),
    description: optionalString(value.description),
    price: optionalString(value.price),
    imageUrl: optionalString(value.imageUrl),
    ctaLabel: optionalString(value.ctaLabel),
    ctaUrl: optionalString(value.ctaUrl),
    badge: optionalString(value.badge),
  };
}

/** Read every product stored in a catalog page's product grid (order preserved). */
export function extractCatalogProducts(value: unknown): CatalogProduct[] {
  const blocks = catalogBlocks(value);
  if (!blocks) return [];
  const grid = blocks.find((block) => isRecord(block) && block.type === "productGrid");
  if (!isRecord(grid) || !isRecord(grid.content)) return [];
  const products = grid.content.products;
  if (!Array.isArray(products)) return [];
  return products
    .map(toCatalogProduct)
    .filter((product): product is CatalogProduct => product !== null);
}
