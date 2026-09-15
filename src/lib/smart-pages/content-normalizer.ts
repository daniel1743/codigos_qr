/**
 * CRIPQER SMART PAGES V1 - normalization.
 *
 * Converts intake drafts into NormalizedContentV1.
 * HARD RULE: no critical business fact is ever invented. Anything the source
 * did not provide becomes a NormalizationIssue and lowers item confidence.
 *
 * SMART_PAGES_2 note: Smart Pages normalization belongs to semantic
 * intake/planning. Engine V2's own `normalizeContent` remains Engine-owned and
 * is NOT merged with this module.
 *
 * `DraftRecord` / `IntakeDraft` / `IntakeSourceKind` are inlined here so the
 * normalizer stays self-contained (the package `intake-adapters.ts` host
 * boundary is out of scope for this phase).
 */

import type {
  CatalogCategoryV1,
  CatalogItemV1,
  CatalogV1,
  ItemType,
  MediaAssetV1,
  NormalizationIssue,
  NormalizedContentV1,
  PriceV1,
  SalesMode,
} from "./catalog.types";
import { emptyNormalizedContent } from "./catalog.types";

/** Inlined from the package intake-adapters boundary (out of scope this phase). */
export type IntakeSourceKind = "json" | "csv" | "text" | "pdf" | "docx" | "xlsx" | "image" | "url";

/** A loose, pre-normalization record extracted from any source. */
export interface DraftRecord {
  [key: string]: string | number | boolean | null | undefined;
}

export interface IntakeDraft {
  source: IntakeSourceKind;
  records: DraftRecord[];
  /** Untyped leftovers (headings, paragraphs) kept for review. */
  notes: string[];
  warnings: string[];
}

export interface NormalizeOptions {
  businessName: string;
  businessType: string;
  itemType: ItemType;
  catalogKind: CatalogV1["kind"];
  salesMode: SalesMode;
  catalogId?: string;
}

const NAME_KEYS = ["name", "title", "item", "product", "service", "nombre", "producto", "servicio"];
const DESC_KEYS = [
  "description",
  "desc",
  "detail",
  "details",
  "descripcion",
  "descripción",
  "resumen",
];
const PRICE_KEYS = ["price", "amount", "cost", "value", "precio", "valor"];
const CURRENCY_KEYS = ["currency", "moneda"];
const CATEGORY_KEYS = [
  "category",
  "categoria",
  "categoría",
  "section",
  "group",
  "collection",
  "tipo",
];
const IMAGE_KEYS = ["image", "img", "photo", "picture", "imagen", "foto", "media", "thumbnail"];
const RESERVED = new Set([
  ...NAME_KEYS,
  ...DESC_KEYS,
  ...PRICE_KEYS,
  ...CURRENCY_KEYS,
  ...CATEGORY_KEYS,
  ...IMAGE_KEYS,
  "featured",
  "id",
  "enabled",
]);

function pick(record: DraftRecord, keys: string[]): string | undefined {
  for (const [rawKey, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === "") continue;
    if (keys.includes(rawKey.trim().toLowerCase())) return String(value).trim();
  }
  return undefined;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Deterministic, collision-free id. */
export function stableId(prefix: string, seed: string, index: number): string {
  const base = slugify(seed) || "item";
  return `${prefix}_${base}_${index}`;
}

/** Parses a price WITHOUT inventing one. Unparseable text is kept as a label. */
export function parsePrice(raw: string | undefined, currencyHint?: string): PriceV1 | undefined {
  if (!raw) return undefined;
  const text = raw.trim();
  if (!text) return undefined;
  const symbol = /€/.test(text) ? "EUR" : /£/.test(text) ? "GBP" : undefined;
  const codeMatch = text.match(/\b(usd|clp|eur|mxn|ars|cop|brl|pen|gbp)\b/i);
  const numeric = text.replace(/[^\d.,]/g, "");
  const cleaned =
    numeric.includes(",") && numeric.includes(".")
      ? numeric.replace(/\./g, "").replace(",", ".")
      : numeric.replace(/,(\d{3})\b/g, "$1").replace(",", ".");
  const amount = Number.parseFloat(cleaned);
  const currency = (codeMatch?.[1] ?? currencyHint ?? symbol)?.toUpperCase();
  if (!Number.isFinite(amount)) return { label: text };
  const price: PriceV1 = { amount, label: text };
  if (currency) price.currency = currency;
  return price;
}

export function normalizeDrafts(
  drafts: IntakeDraft[],
  options: NormalizeOptions,
): NormalizedContentV1 {
  const content = emptyNormalizedContent(options.businessName);
  content.business.businessType = options.businessType;

  const issues: NormalizationIssue[] = [];
  const categories = new Map<string, CatalogCategoryV1>();
  const items: CatalogItemV1[] = [];
  let index = 0;

  for (const draft of drafts) {
    for (const warning of draft.warnings) {
      issues.push({
        scope: "source",
        severity: "uncertain",
        message: `${draft.source}: ${warning}`,
      });
    }
    for (const record of draft.records) {
      const name = pick(record, NAME_KEYS);
      if (!name) {
        issues.push({
          scope: "item",
          severity: "missing",
          field: "name",
          message: "A source row was skipped because it had no recognizable name.",
        });
        continue;
      }
      const id = stableId("itm", name, index);
      const review: string[] = [];

      const categoryName = pick(record, CATEGORY_KEYS);
      let categoryId: string | undefined;
      if (categoryName) {
        categoryId = stableId("cat", categoryName, 0);
        if (!categories.has(categoryId)) {
          categories.set(categoryId, {
            id: categoryId,
            name: categoryName,
            order: categories.size,
          });
        }
      }

      const price = parsePrice(pick(record, PRICE_KEYS), pick(record, CURRENCY_KEYS));
      if (!price) review.push("price");
      const description = pick(record, DESC_KEYS);
      if (!description) review.push("description");

      const imageUrl = pick(record, IMAGE_KEYS);
      const media: MediaAssetV1[] = imageUrl
        ? [{ id: `${id}_m0`, url: imageUrl, alt: name, kind: "image" }]
        : [];
      if (media.length === 0) review.push("media");

      const attributes = Object.entries(record)
        .filter(
          ([key, value]) =>
            !RESERVED.has(key.trim().toLowerCase()) && value !== "" && value != null,
        )
        .map(([key, value]) => ({
          key: slugify(key) || key,
          label: key.replace(/[_-]+/g, " ").trim(),
          value: String(value),
        }));

      for (const field of review) {
        issues.push({
          scope: "item",
          refId: id,
          field,
          severity: "missing",
          message: `"${name}" has no ${field} in the source. It stays empty until reviewed.`,
        });
      }

      const item: CatalogItemV1 = {
        id,
        type: options.itemType,
        name,
        media,
        attributes,
        salesMode: options.salesMode,
        featured: String(record["featured"] ?? "").toLowerCase() === "true",
        enabled: String(record["enabled"] ?? "true").toLowerCase() !== "false",
        confidence: Math.max(0.2, 1 - review.length * 0.2),
        review,
      };
      if (description) item.description = description;
      if (categoryId) item.categoryId = categoryId;
      if (price) item.price = price;
      items.push(item);
      index += 1;
    }
  }

  if (items.length > 0) {
    content.catalogs.push({
      id: options.catalogId ?? "catalog_main",
      kind: options.catalogKind,
      categories: Array.from(categories.values()),
      items,
    });
  }
  content.issues = issues;
  return content;
}

/** Merges a partial content patch over normalized content (host-supplied facts win). */
export function mergeContent(
  base: NormalizedContentV1,
  patch: Partial<NormalizedContentV1>,
): NormalizedContentV1 {
  return {
    ...base,
    ...patch,
    business: { ...base.business, ...(patch.business ?? {}) },
    contact: { ...base.contact, ...(patch.contact ?? {}) },
    catalogs: patch.catalogs ?? base.catalogs,
    issues: [...base.issues, ...(patch.issues ?? [])],
  };
}
