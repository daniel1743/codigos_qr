/**
 * CRIPQER SMART PAGES — RETAIL PRESENTATION V1 (presentation-only).
 *
 * This module derives merchandising intent from normalized owner content. It
 * does not define a catalog database, a canonical document, a renderer or a
 * checkout model. The host decides which derived fields are representable.
 *
 * Data integrity: labels and benefits come from the owner source, while
 * structural labels are deterministic. No discounts, ratings, urgency,
 * popularity, stock or other commercial claims are invented.
 */

import type { CatalogItemV1, CatalogV1, MediaAssetV1, NormalizedContentV1 } from "./catalog.types";

export interface RetailCategoryTileV1 {
  categoryId: string;
  label: string;
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
    content.catalogs.find((catalog) => catalog.kind === "catalog" && catalog.items.length > 0) ??
    content.catalogs.find((catalog) => catalog.items.length > 0)
  );
}

/** Returns undefined when there are no enabled owner catalog items. */
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

  // Prefer the richest real category, then a real gallery/cover asset.
  const ranked = categoryTiles.slice().sort((a, b) => b.itemCount - a.itemCount);
  const bannerTile = ranked.find((tile) => Boolean(tile.media)) ?? ranked[0];
  const bannerCategory = bannerTile
    ? catalog.categories.find((category) => category.id === bannerTile.categoryId)
    : undefined;
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

  const secondaryTile = ranked.find((tile) => tile.categoryId !== bannerTile?.categoryId);
  const secondaryCategory = secondaryTile
    ? catalog.categories.find((category) => category.id === secondaryTile.categoryId)
    : undefined;
  const secondaryCollection: RetailCollectionV1 | undefined = secondaryTile
    ? {
        id: `retail_collection_${secondaryTile.categoryId}`,
        title: secondaryTile.label,
        categoryId: secondaryTile.categoryId,
        ...(secondaryCategory?.description ? { description: secondaryCategory.description } : {}),
        itemIds: (byCategory.get(secondaryTile.categoryId) ?? [])
          .slice(0, 8)
          .map((item) => item.id),
      }
    : undefined;

  const benefits: RetailBenefitV1[] = [
    ...(content.business.differentiators ?? []).map((differentiator) => ({
      id: differentiator.id,
      title: differentiator.title,
      ...(differentiator.description ? { description: differentiator.description } : {}),
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
