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
