import type { SupabaseClient } from "@supabase/supabase-js";
import { createPageStarterConfig } from "../../components/power-editor/pageStarterConfig";
import { cardFamilies } from "../../isolated/magic-page-editor/data/cardFamilies";
import { cardOrder, baseIndex } from "../../isolated/magic-page-editor/utils/cardOps";
import type { PageDoc } from "../../isolated/magic-page-editor/types/editor";
import { uid } from "../../premium-template-studio/utils";
import type {
  BioTemplateConfig,
  BlockItem,
  TemplateBlock,
} from "../../premium-template-studio/types";
import { pageCanonicalService } from "../../services/page-canonical.service";
import { pageService } from "../../services/page.service";
import type { Page } from "../../types/database";
import { readCatalogLink, writeCatalogLink } from "./catalog-link";

const CATALOG_BLOCK_KEY = "catalog";

export interface EmbeddedCatalogProduct extends BlockItem {
  id: string;
}

export interface CatalogConversionInput {
  supabase: SupabaseClient;
  userId: string;
  profileId: string;
  landingPageTitle: string;
  document: PageDoc;
  blockKey?: string;
  saveLanding: (document: PageDoc) => Promise<void>;
}

export interface CatalogConversionResult {
  status: "linked";
  catalogPage: Page;
  document: PageDoc;
  productIds: string[];
}

export interface CatalogConversionDependencies {
  createPage?: typeof pageService.createPage;
  saveCatalogDraft?: typeof pageCanonicalService.saveDraft;
  deletePage?: typeof pageService.deleteOwnedChildPage;
}

const inFlight = new Map<string, Promise<CatalogConversionResult>>();

function currentText(doc: PageDoc, id: string, fallback: string | undefined): string | undefined {
  const value = doc.texts[id] ?? fallback;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function currentProp(doc: PageDoc, id: string, key: string): string | undefined {
  const value = doc.props[id]?.[key];
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function visibleCardIds(doc: PageDoc, blockKey: string): string[] {
  const family = cardFamilies.catalog;
  return cardOrder(doc, blockKey, family.items.length).filter((itemId) => {
    const cardId = `block:${blockKey}.card.${itemId}`;
    return doc.removed[cardId] !== true && doc.props[cardId]?.hidden !== "on";
  });
}

/**
 * Extracts what the owner currently sees in the embedded catalog. Defaults
 * are only fallbacks for fields without an override; edited PageDoc values
 * always win. Positional card ids never escape into the canonical catalog.
 */
export function extractEmbeddedCatalogProducts(
  doc: PageDoc,
  blockKey = CATALOG_BLOCK_KEY,
): EmbeddedCatalogProduct[] {
  const block = doc.blocks.find((candidate) => candidate.key === blockKey);
  if (!block || block.type !== "catalog") return [];
  const family = cardFamilies.catalog;
  return visibleCardIds(doc, blockKey)
    .map((itemId) => {
      const item = family.items[baseIndex(itemId)];
      if (!item) return null;
      const cardId = `block:${blockKey}.card.${itemId}`;
      const imageId = `${cardId}.img`;
      const ctaId = `${cardId}.cta`;
      const product: EmbeddedCatalogProduct = {
        id: uid("product"),
        title: currentText(doc, `${cardId}.title`, item.title),
        description: currentText(doc, `${cardId}.desc`, item.description),
        price: currentText(doc, `${cardId}.price`, item.price),
        imageUrl: currentProp(doc, imageId, "src") ?? item.image,
        ctaLabel: currentText(doc, `${ctaId}.label`, item.cta),
      };
      const ctaUrl = currentProp(doc, ctaId, "href");
      if (ctaUrl) product.ctaUrl = ctaUrl;
      return product;
    })
    .filter((product): product is EmbeddedCatalogProduct => product !== null)
    .slice(0, 3);
}

function replaceStarterProducts(
  config: BioTemplateConfig,
  products: EmbeddedCatalogProduct[],
): BioTemplateConfig {
  const productGrid = config.blocks.find((block) => block.type === "productGrid");
  if (!productGrid) throw new Error("El starter de catálogo no contiene un bloque productGrid.");
  const nextBlocks = config.blocks.map((block) =>
    block.id === productGrid.id
      ? ({ ...block, content: { ...block.content, products } } as TemplateBlock)
      : block,
  );
  return { ...config, blocks: nextBlocks };
}

async function convert(
  input: CatalogConversionInput,
  deps: CatalogConversionDependencies,
): Promise<CatalogConversionResult> {
  const blockKey = input.blockKey ?? CATALOG_BLOCK_KEY;
  const existing = readCatalogLink(input.document, blockKey);
  if (existing.mode === "linked" && existing.catalogPublicId) {
    return {
      status: "linked",
      catalogPage: { public_id: existing.catalogPublicId } as Page,
      document: input.document,
      productIds: existing.featuredProductIds,
    };
  }

  const products = extractEmbeddedCatalogProducts(input.document, blockKey);
  if (products.length === 0)
    throw new Error("El mini catálogo no tiene productos visibles para convertir.");

  const createPage = deps.createPage ?? pageService.createPage;
  const saveCatalogDraft = deps.saveCatalogDraft ?? pageCanonicalService.saveDraft;
  const deletePage = deps.deletePage ?? pageService.deleteOwnedChildPage;
  const catalogPage = await createPage(input.supabase, {
    userId: input.userId,
    profileId: input.profileId,
    title: input.landingPageTitle,
    pageType: "catalog",
  });

  try {
    if (!catalogPage.public_id) {
      throw new Error("La página de catálogo no devolvió un public_id válido.");
    }
    const starter = replaceStarterProducts(
      createPageStarterConfig(input.landingPageTitle, "catalog"),
      products,
    );
    await saveCatalogDraft(input.supabase, catalogPage.id, input.userId, starter);
    const productIds = products.map((product) => product.id);
    const linkedDocument = writeCatalogLink(input.document, blockKey, {
      ...existing,
      mode: "linked",
      catalogPublicId: catalogPage.public_id,
      featuredProductIds: productIds,
    });
    await input.saveLanding(linkedDocument);
    return { status: "linked", catalogPage, document: linkedDocument, productIds };
  } catch (error) {
    try {
      await deletePage(input.supabase, catalogPage.id, input.userId);
    } catch (compensationError) {
      throw new Error(
        `${error instanceof Error ? error.message : "No se pudo convertir el catálogo."} La compensación también falló: ${compensationError instanceof Error ? compensationError.message : "error desconocido"}`,
      );
    }
    throw error;
  }
}

/** Converts once per landing block while an earlier request is still running. */
export function convertEmbeddedCatalogToFullCatalog(
  input: CatalogConversionInput,
  deps: CatalogConversionDependencies = {},
): Promise<CatalogConversionResult> {
  const key = `${input.userId}:${input.profileId}:${input.blockKey ?? CATALOG_BLOCK_KEY}`;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const request = convert(input, deps).finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}
