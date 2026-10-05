import type { PageDoc } from "../../isolated/magic-page-editor/types/editor";

export const CATALOG_LINK_MAX_FEATURED_PRODUCTS = 3;

export type CatalogLinkMode = "embedded" | "linked";

export interface CatalogLinkConfig {
  mode: CatalogLinkMode;
  catalogPublicId: string | null;
  featuredProductIds: string[];
  ctaLabel?: string;
  sectionTitle?: string;
}

/**
 * The minimal product projection the landing shows for a linked catalog. It is
 * intentionally a read-only view of what the full catalog stores: the landing
 * never edits catalog products, it only displays the featured subset.
 */
export interface CatalogProduct {
  id: string;
  title?: string;
  description?: string;
  price?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  badge?: string;
}

/** Resolved availability of one linked catalog for the landing/summary UI. */
export interface CatalogAccessResult {
  /** Owned page id when resolvable (powers "Editar catálogo"). */
  pageId: string | null;
  /** Every product stored in the catalog, or null when it cannot be resolved. */
  products: CatalogProduct[] | null;
  /**
   * Whether the linked catalog is published. "Ver catálogo" points to the public
   * page (`/pg/{catalogPublicId}`), which only resolves for a PUBLISHED catalog,
   * so the UI must gate that action on this flag to avoid a 404.
   */
  published: boolean;
}

/** Host-provided resolver: maps a catalog public id to its page + products. */
export interface CatalogAccess {
  resolve: (catalogPublicId: string) => Promise<CatalogAccessResult>;
}

/** Stable public child-page path for a linked catalog (public_id identity). */
export function catalogPublicHref(catalogPublicId: string): string {
  return `/pg/${catalogPublicId}`;
}

/** A valid full catalog exists only when the block holds a linked public id. */
export function isLinkedCatalog(link: CatalogLinkConfig): boolean {
  return link.mode === "linked" && Boolean(link.catalogPublicId);
}

const CATALOG_LINK_PROPS = (blockKey: string): string => `block:${blockKey}`;

function uniqueStringIds(value: readonly string[]): string[] {
  return [...new Set(value.map((id) => id.trim()).filter(Boolean))].slice(
    0,
    CATALOG_LINK_MAX_FEATURED_PRODUCTS,
  );
}

/** Parse legacy/new featured ids without allowing malformed data to escape. */
export function parseFeaturedProductIds(value: unknown): string[] {
  if (typeof value !== "string") return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return uniqueStringIds(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return [];
  }
}

/** Serialize ids in a stable, bounded form for PageDoc's string-only props. */
export function serializeFeaturedProductIds(ids: readonly string[]): string {
  return JSON.stringify(uniqueStringIds(ids));
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

/** Normalize persisted metadata while treating unknown/invalid links as embedded. */
export function normalizeCatalogLink(input: Partial<CatalogLinkConfig>): CatalogLinkConfig {
  const catalogPublicId = optionalString(input.catalogPublicId) ?? null;
  const requestedMode: CatalogLinkMode = input.mode === "linked" ? "linked" : "embedded";
  const mode: CatalogLinkMode =
    requestedMode === "linked" && catalogPublicId ? "linked" : "embedded";

  return {
    mode,
    catalogPublicId: mode === "linked" ? catalogPublicId : null,
    featuredProductIds: uniqueStringIds(input.featuredProductIds ?? []),
    ...(optionalString(input.ctaLabel) ? { ctaLabel: optionalString(input.ctaLabel) } : {}),
    ...(optionalString(input.sectionTitle)
      ? { sectionTitle: optionalString(input.sectionTitle) }
      : {}),
  };
}

/** Read a catalog block's link metadata. Missing metadata is legacy embedded mode. */
export function readCatalogLink(doc: PageDoc, blockKey: string): CatalogLinkConfig {
  const props = doc.props[CATALOG_LINK_PROPS(blockKey)] ?? {};
  return normalizeCatalogLink({
    mode: props.mode as CatalogLinkMode | undefined,
    catalogPublicId: props.catalogPublicId,
    featuredProductIds: parseFeaturedProductIds(props.featuredProductIds),
    ctaLabel: props.ctaLabel,
    sectionTitle: props.sectionTitle,
  });
}

/**
 * Write only catalog-link metadata, preserving card text, order, unrelated props,
 * and removed state. Existing catalogPublished metadata is intentionally left
 * untouched because markPublishedCatalogs remains its authority.
 */
export function writeCatalogLink(
  doc: PageDoc,
  blockKey: string,
  input: CatalogLinkConfig,
): PageDoc {
  const blockPropsKey = CATALOG_LINK_PROPS(blockKey);
  const normalized = normalizeCatalogLink(input);
  const currentBlockProps = doc.props[blockPropsKey] ?? {};
  const nextBlockProps: Record<string, string> = {
    ...currentBlockProps,
    mode: normalized.mode,
    catalogPublicId: normalized.catalogPublicId ?? "",
    featuredProductIds: serializeFeaturedProductIds(normalized.featuredProductIds),
  };

  if (normalized.ctaLabel) nextBlockProps.ctaLabel = normalized.ctaLabel;
  else delete nextBlockProps.ctaLabel;

  if (normalized.sectionTitle) nextBlockProps.sectionTitle = normalized.sectionTitle;
  else delete nextBlockProps.sectionTitle;

  return {
    ...doc,
    props: {
      ...doc.props,
      [blockPropsKey]: nextBlockProps,
    },
  };
}

/**
 * The products the landing must show for a linked catalog: the catalog's own
 * products filtered/ordered by `featuredProductIds`, deduplicated and capped at
 * three. Ids that no longer resolve (e.g. a product deleted from the full
 * catalog) are silently ignored so the landing degrades without empty cards.
 */
export function resolveFeaturedProducts(
  link: CatalogLinkConfig,
  products: readonly CatalogProduct[],
): CatalogProduct[] {
  if (!isLinkedCatalog(link)) return [];
  const byId = new Map(products.map((product) => [product.id, product]));
  return uniqueStringIds(link.featuredProductIds)
    .map((id) => byId.get(id))
    .filter((product): product is CatalogProduct => Boolean(product));
}

/**
 * Toggle one catalog product in the featured set while preserving order and
 * uniqueness. Selecting past the three-product cap is a no-op, so the landing
 * can never hold more than the allowed number of featured products.
 */
export function toggleFeaturedProduct(
  featuredProductIds: readonly string[],
  productId: string,
  selected: boolean,
): string[] {
  const id = productId.trim();
  if (!id) return uniqueStringIds(featuredProductIds);
  const current = uniqueStringIds(featuredProductIds);
  if (!selected) return current.filter((entry) => entry !== id);
  if (current.includes(id)) return current;
  return uniqueStringIds([...current, id]);
}
