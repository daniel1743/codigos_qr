/**
 * SMART_PAGES_4 — Retail semantic capability gate.
 *
 * This is a host mapper, not a Retail Engine. It derives the approved
 * presentation semantics, emits only the existing Engine V2 content shapes,
 * and reports everything that has no current canonical representation.
 */

import type { ContentSourceV2 } from "@/lib/parametric-engine-v2/power-editor/content-source";
import { isSafeUrl } from "@/lib/parametric-engine-v2/power-editor/content-source";
import { isValidWhatsApp, normalizePhoneDigits } from "@/lib/parametric-engine-v2/destinations";
import type { BioTemplateConfig, BlockItem, TemplateBlock } from "@/premium-template-studio/types";
import type {
  CatalogItemV1,
  CatalogV1,
  NormalizedContentV1,
} from "@/lib/smart-pages/catalog.types";
import {
  deriveRetailPresentation,
  type RetailPresentationV1,
} from "@/lib/smart-pages/retail-presentation";
import type { PageGenerationRequest, PagePlanV1 } from "@/lib/smart-pages/smart-pages.types";
import type { GeneratedPageInput } from "./types";

export interface SmartPagesRetailDiagnostics {
  mapped: string[];
  deferred: string[];
  rejected: string[];
  warnings: string[];
}

export interface SmartPagesRetailMappingSuccess {
  ok: true;
  input: GeneratedPageInput;
  presentation: RetailPresentationV1;
  contentBlocks: Partial<ContentSourceV2>;
  diagnostics: SmartPagesRetailDiagnostics;
}

export interface SmartPagesRetailMappingFailure {
  ok: false;
  errors: string[];
  presentation?: RetailPresentationV1;
  diagnostics: SmartPagesRetailDiagnostics;
}

export type SmartPagesRetailMappingResult =
  SmartPagesRetailMappingSuccess | SmartPagesRetailMappingFailure;

function canonicalWhatsAppUrl(value: unknown, target: string | undefined): string | undefined {
  if (typeof value !== "string" || !target || value.trim() !== target.trim()) return undefined;
  if (!isValidWhatsApp(target)) return undefined;
  return `https://wa.me/${normalizePhoneDigits(target)}`;
}

function reconcileRetailBlock(
  block: TemplateBlock,
  whatsappTarget: string | undefined,
): TemplateBlock {
  let changed = false;
  let content = block.content;

  // The frozen V2 planner currently writes productGrid children under
  // `content.items`, while ProductGridBlock consumes `content.products`.
  // Normalize that boundary here, in the host seam, without changing Engine V2
  // internals or the public renderer.
  if (block.type === "productGrid" && Array.isArray(content.items) && !content.products) {
    const { items, ...rest } = content;
    content = { ...rest, products: items as BlockItem[] };
    changed = true;
  }

  const url = canonicalWhatsAppUrl(content.url, whatsappTarget);
  const primaryUrl = canonicalWhatsAppUrl(content.primaryCTA?.url, whatsappTarget);
  const secondaryUrl = canonicalWhatsAppUrl(content.secondaryCTA?.url, whatsappTarget);
  const items = Array.isArray(content.items)
    ? content.items.map((item) => {
        const itemUrl = canonicalWhatsAppUrl(item.url, whatsappTarget);
        if (!itemUrl) return item;
        changed = true;
        return { ...item, url: itemUrl };
      })
    : content.items;
  if (url || primaryUrl || secondaryUrl || items !== content.items) {
    content = {
      ...content,
      ...(url ? { url } : {}),
      ...(primaryUrl && content.primaryCTA
        ? { primaryCTA: { ...content.primaryCTA, url: primaryUrl } }
        : {}),
      ...(secondaryUrl && content.secondaryCTA
        ? { secondaryCTA: { ...content.secondaryCTA, url: secondaryUrl } }
        : {}),
      ...(items !== content.items ? { items } : {}),
    };
    changed = true;
  }
  return changed ? { ...block, content } : block;
}

/**
 * Repairs only two proven host/renderer contract mismatches in a retail
 * generation result: product-grid child naming and WhatsApp URL presentation.
 * This is a pure host projection; it does not change Engine V2 or renderer
 * code, add a schema, or persist anything.
 */
export function reconcileRetailGeneratedConfig(
  config: BioTemplateConfig,
  whatsappTarget?: string,
): BioTemplateConfig {
  let changed = false;
  const blocks = config.blocks.map((block) => {
    const next = reconcileRetailBlock(block, whatsappTarget);
    if (next !== block) changed = true;
    return next;
  });
  return changed ? { ...config, blocks } : config;
}

function diagnostics(): SmartPagesRetailDiagnostics {
  return { mapped: [], deferred: [], rejected: [], warnings: [] };
}

function pushOnce(target: string[], value: string): void {
  if (!target.includes(value)) target.push(value);
}

function catalogFor(content: NormalizedContentV1): CatalogV1 | undefined {
  return (
    content.catalogs.find((catalog) => catalog.kind === "catalog" && catalog.items.length > 0) ??
    content.catalogs.find((catalog) => catalog.items.length > 0)
  );
}

function itemMedia(item: CatalogItemV1): string | undefined {
  const image = item.media.find((media) => media.kind === "image")?.url;
  return image && isSafeUrl(image) ? image : undefined;
}

function itemDestination(item: CatalogItemV1): string | undefined {
  const actionTarget = item.action?.enabled ? item.action.target?.trim() : undefined;
  // Checkout is explicitly outside this presentation-only phase.
  const supportedActionTarget =
    item.action?.kind !== "checkout" && actionTarget && isSafeUrl(actionTarget)
      ? actionTarget
      : undefined;
  if (supportedActionTarget) return supportedActionTarget;

  const attributeTarget = item.attributes
    .find((attribute) => ["url", "link", "href"].includes(attribute.key.trim().toLowerCase()))
    ?.value.trim();
  return attributeTarget && isSafeUrl(attributeTarget) ? attributeTarget : undefined;
}

function displayPrice(item: CatalogItemV1): string | undefined {
  const label = item.price?.label?.trim();
  if (label) return label;
  if (item.price?.amount === undefined || !Number.isFinite(item.price.amount)) return undefined;
  return `${item.price.currency?.trim() ?? ""}${item.price.amount}`.trim() || undefined;
}

function productContent(
  item: CatalogItemV1,
): NonNullable<ContentSourceV2["products"]>[number] | undefined {
  const imageUrl = itemMedia(item);
  if (!imageUrl) return undefined;
  const url = itemDestination(item);
  const price = displayPrice(item);
  return {
    title: item.name,
    imageUrl,
    ...(price ? { price } : {}),
    ...(item.description ? { description: item.description } : {}),
    ...(url ? { ctaUrl: url } : {}),
  };
}

function transactionDiagnostics(
  content: NormalizedContentV1,
  result: SmartPagesRetailDiagnostics,
): void {
  const keys = new Set(["stock", "inventory", "sku", "discount", "availability", "checkout"]);
  for (const catalog of content.catalogs) {
    for (const item of catalog.items) {
      for (const attribute of item.attributes) {
        const key = attribute.key.trim().toLowerCase();
        if (keys.has(key)) pushOnce(result.rejected, `unsupported transaction field: ${key}`);
      }
      if (item.action?.kind === "checkout") {
        pushOnce(result.rejected, `unsupported transaction action: checkout (${item.id})`);
      }
    }
  }
}

function applyPresentationDiagnostics(
  presentation: RetailPresentationV1,
  plan: PagePlanV1,
  result: SmartPagesRetailDiagnostics,
): void {
  if (presentation.categoryTiles.length) {
    pushOnce(
      result.mapped,
      `retail.category metadata retained (${presentation.categoryTiles.length})`,
    );
    pushOnce(result.deferred, "retail.categoryTiles -> no first-class canonical category block");
  }
  if (presentation.secondaryCollection) {
    pushOnce(result.deferred, "retail.secondaryCollection -> deferred; no secondary rail");
    pushOnce(
      result.warnings,
      "Secondary collection is not emitted as a separate canonical block or silently re-labeled.",
    );
  }
  if (presentation.benefits.length) {
    pushOnce(
      result.mapped,
      `retail.benefits retained semantically (${presentation.benefits.length})`,
    );
    pushOnce(result.deferred, "retail.benefits -> no first-class canonical benefit strip");
  }
  if (presentation.gridDensity === "standard") {
    pushOnce(result.mapped, "retail.gridDensity=standard -> existing default grid behavior");
  } else {
    pushOnce(
      result.deferred,
      "retail.gridDensity=dense -> deferred as semantic (no canonical density field)",
    );
  }
  if (plan.runtimeRequirements.needsDetailView) {
    pushOnce(result.deferred, "retail.richItemDetail -> deferred; no modal/detail route");
  }
}

function featuredContent(
  presentation: RetailPresentationV1,
  catalog: CatalogV1,
  result: SmartPagesRetailDiagnostics,
): ContentSourceV2["featured"] {
  for (const featuredId of presentation.featuredItemIds) {
    const item = catalog.items.find(
      (candidate) => candidate.id === featuredId && candidate.enabled,
    );
    if (!item) {
      pushOnce(result.deferred, `retail.featured item ${featuredId} -> unknown owner item`);
      continue;
    }
    const imageUrl = itemMedia(item);
    const url = itemDestination(item);
    if (!imageUrl || !url) {
      pushOnce(
        result.deferred,
        `retail.featured item ${featuredId} -> missing supported media/link`,
      );
      continue;
    }
    pushOnce(result.mapped, `retail.featured.${featuredId} -> Engine featured`);
    return {
      title: item.name,
      ...(item.description ? { subtitle: item.description } : {}),
      imageUrl,
      url,
    };
  }
  return undefined;
}

/**
 * Derives retail semantics and augments the existing GeneratedPageInput with
 * only host-supported content. It performs no Engine call and no persistence.
 * `suppliedPresentation` is testable semantic input; production callers omit it
 * so the presentation is derived from normalized owner content.
 */
export function mapRetailPresentationToHostInput(
  request: PageGenerationRequest,
  plan: PagePlanV1,
  baseInput: GeneratedPageInput,
  suppliedPresentation?: RetailPresentationV1,
): SmartPagesRetailMappingResult {
  const result = diagnostics();
  const presentation = suppliedPresentation ?? deriveRetailPresentation(request.content);
  const catalog = catalogFor(request.content);
  if (!presentation || !catalog) {
    result.rejected.push("retail catalog requires at least one enabled owner item");
    return {
      ok: false,
      errors: [...result.rejected],
      diagnostics: result,
      ...(presentation ? { presentation } : {}),
    };
  }

  applyPresentationDiagnostics(presentation, plan, result);
  transactionDiagnostics(request.content, result);

  const enabledItems = catalog.items.filter((item) => item.enabled);
  const products = enabledItems.map(productContent);
  if (products.some((product) => !product)) {
    result.rejected.push("retail product without owner image/media");
    result.warnings.push(
      "Every retail product must keep a real owner image for the current product contract.",
    );
    return { ok: false, errors: [...result.rejected], presentation, diagnostics: result };
  }

  const contentBlocks: Partial<ContentSourceV2> = {
    products: products as NonNullable<ContentSourceV2["products"]>,
  };
  const featured = featuredContent(presentation, catalog, result);
  if (featured) contentBlocks.featured = featured;

  const bannerUrl = presentation.banner?.media?.url;
  const input =
    !baseInput.coverImageUrl && bannerUrl && isSafeUrl(bannerUrl)
      ? { ...baseInput, coverImageUrl: bannerUrl }
      : baseInput;
  if (input.coverImageUrl !== baseInput.coverImageUrl) {
    pushOnce(result.mapped, "retail.banner.media -> existing host coverImageUrl");
  }
  pushOnce(
    result.mapped,
    `retail.products -> Engine product${products.length === 1 ? "" : "Grid"}`,
  );
  pushOnce(result.mapped, "retail.owner price/media/name/description preserved");

  return { ok: true, input, presentation, contentBlocks, diagnostics: result };
}
