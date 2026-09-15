/**
 * CRIPQER SMART PAGES — RETAIL PRESENTATION V1 (presentation-only).
 *
 * This module adds NO new business model, NO second catalog schema and NO
 * second PagePlan. It derives a merchandising *presentation* from data that
 * already exists in NormalizedContentV1 (categories, items, media, business
 * differentiators) so the Master Runtime can render a denser, store-like
 * composition with the same reusable blocks.
 *
 * Data integrity: nothing here invents discounts, badges, ratings, urgency,
 * "best seller" or "new arrival" claims. Every label is either structural
 * ("Categories") or taken verbatim from the source content.
 */

import type { CatalogItemV1, CatalogV1, MediaAssetV1, NormalizedContentV1 } from "./catalog.types";

export interface RetailCategoryTileV1 {
  categoryId: string;
  label: string;
  /** Real number of enabled items in this category. */
  itemCount: number;
  media?: MediaAssetV1;
}

export interface RetailCollectionV1 {
  id: string;
  title: string;
  description?: string;
  categoryId?: string;
  itemIds: string[];
}

export interface RetailBannerV1 {
  id: string;
  /** Structural title built from a real category/collection name. */
  title: string;
  description?: string;
  media?: MediaAssetV1;
  categoryId?: string;
}

export interface RetailBenefitV1 {
  id: string;
  title: string;
  description?: string;
}

export interface RetailPresentationV1 {
  version: "1";
  categoryTiles: RetailCategoryTileV1[];
  featuredItemIds: string[];
  banner?: RetailBannerV1;
  secondaryCollection?: RetailCollectionV1;
  /** Only from supplied differentiators / badges. Never invented. */
  benefits: RetailBenefitV1[];
  gridDensity: "standard" | "dense";
}

function firstMedia(items: CatalogItemV1[]): MediaAssetV1 | undefined {
  for (const item of items) {
    const media = item.media[0];
    if (media) return media;
  }
  return undefined;
}

function pickCatalog(content: NormalizedContentV1): CatalogV1 | undefined {
  return (
    content.catalogs.find((c) => c.kind === "catalog" && c.items.length > 0) ??
    content.catalogs.find((c) => c.items.length > 0)
  );
}

/**
 * Returns undefined when the content cannot support a retail composition
 * (no catalog items). The runtime then renders the standard composition.
 */
export function deriveRetailPresentation(
  content: NormalizedContentV1,
): RetailPresentationV1 | undefined {
  const catalog = pickCatalog(content);
  if (!catalog) return undefined;

  const items = catalog.items.filter((item) => item.enabled);
  if (items.length === 0) return undefined;

  const byCategory = new Map<string, CatalogItemV1[]>();
  for (const item of items) {
    if (!item.categoryId) continue;
    const list = byCategory.get(item.categoryId) ?? [];
    list.push(item);
    byCategory.set(item.categoryId, list);
  }

  const categoryTiles: RetailCategoryTileV1[] = catalog.categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((category) => {
      const list = byCategory.get(category.id) ?? [];
      const media = firstMedia(list);
      return {
        categoryId: category.id,
        label: category.name,
        itemCount: list.length,
        ...(media ? { media } : {}),
      };
    })
    .filter((tile) => tile.itemCount > 0);

  const featuredItemIds = items.filter((item) => item.featured).map((item) => item.id);

  // Banner: the richest real category, or the business cover as a brand banner.
  const ranked = categoryTiles.slice().sort((a, b) => b.itemCount - a.itemCount);
  const bannerTile = ranked.find((tile) => Boolean(tile.media)) ?? ranked[0];
  const bannerCategory = bannerTile
    ? catalog.categories.find((c) => c.id === bannerTile.categoryId)
    : undefined;
  // A collection banner prefers a lifestyle/business image when one exists.
  const bannerMedia =
    content.gallery[content.gallery.length - 1] ?? bannerTile?.media ?? content.business.cover;
  const banner: RetailBannerV1 | undefined = bannerTile
    ? {
        id: `retail_banner_${bannerTile.categoryId}`,
        title: bannerTile.label,
        categoryId: bannerTile.categoryId,
        ...(bannerCategory?.description ? { description: bannerCategory.description } : {}),
        ...(bannerMedia ? { media: bannerMedia } : {}),
      }
    : undefined;

  // Secondary collection: a different real category, so the page varies.
  const secondaryTile = ranked.find((tile) => tile.categoryId !== bannerTile?.categoryId);
  const secondaryCategory = secondaryTile
    ? catalog.categories.find((c) => c.id === secondaryTile.categoryId)
    : undefined;
  const secondaryCollection: RetailCollectionV1 | undefined = secondaryTile
    ? {
        id: `retail_collection_${secondaryTile.categoryId}`,
        title: secondaryTile.label,
        categoryId: secondaryTile.categoryId,
        ...(secondaryCategory?.description ? { description: secondaryCategory.description } : {}),
        itemIds: (byCategory.get(secondaryTile.categoryId) ?? []).slice(0, 8).map((i) => i.id),
      }
    : undefined;

  const benefits: RetailBenefitV1[] = [
    ...(content.business.differentiators ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      ...(d.description ? { description: d.description } : {}),
    })),
    ...(content.business.badges ?? []).map((badge, index) => ({
      id: `retail_badge_${index}`,
      title: badge,
    })),
  ].slice(0, 4);

  return {
    version: "1",
    categoryTiles,
    featuredItemIds,
    ...(banner ? { banner } : {}),
    ...(secondaryCollection && secondaryCollection.itemIds.length > 1
      ? { secondaryCollection }
      : {}),
    benefits,
    gridDensity: items.length >= 9 ? "dense" : "standard",
  };
}
