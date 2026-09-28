import type { BioTemplateConfig, ValidationIssue, ValidationResult } from "../types";
import { DEFAULT_ELEMENT_CONTRACT, DEFAULT_MEDIA_TREATMENT, SCHEMA_VERSION } from "../types";
import { BlockRegistry } from "./BlockRegistry";
import { isValidUrl } from "../utils";

/** Returns stable paths for stock references that must be replaced before publish. */
export function findReferenceStockImages(config: BioTemplateConfig): string[] {
  const paths: string[] = [];
  config.blocks.forEach((block, blockIndex) => {
    block.content.products?.forEach((product, productIndex) => {
      if (product.imageProvenance?.origin === "reference_stock") {
        paths.push(`blocks[${blockIndex}].content.products[${productIndex}].imageUrl`);
      }
    });
  });
  return paths;
}

function validateMediaProvenance(
  value: unknown,
  path: string,
  push: (level: ValidationIssue["level"], path: string, message: string) => void,
): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    push("error", path, "Media provenance must be an object.");
    return;
  }
  const provenance = value as Record<string, unknown>;
  const origin = provenance.origin;
  if (origin !== "owner" && origin !== "reference_stock" && origin !== "legacy_unknown")
    push("error", `${path}.origin`, "Unknown media provenance origin.");
  const provider = provenance.provider;
  if (provider !== undefined && provider !== "unsplash" && provider !== "pexels")
    push("error", `${path}.provider`, "Unknown contextual media provider.");
  if (origin === "reference_stock" && provider !== "unsplash" && provider !== "pexels")
    push("error", `${path}.provider`, "Reference stock media requires Unsplash or Pexels.");
  if (origin === "owner" && provider !== undefined)
    push("error", `${path}.provider`, "Owner media cannot declare a stock provider.");
  for (const key of [
    "providerAssetId",
    "sourcePageUrl",
    "creatorName",
    "creatorUrl",
    "attributionText",
  ]) {
    if (provenance[key] !== undefined && typeof provenance[key] !== "string")
      push("error", `${path}.${key}`, "Media provenance text fields must be strings.");
  }
  for (const key of ["sourcePageUrl", "creatorUrl"]) {
    if (typeof provenance[key] === "string" && !isValidUrl(provenance[key]))
      push("warning", `${path}.${key}`, `"${provenance[key]}" is not a valid URL.`);
  }
}

function validateHeroMedia(
  value: unknown,
  path: string,
  push: (level: ValidationIssue["level"], path: string, message: string) => void,
): void {
  if (value === undefined) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    push("error", path, "Hero media must be an object.");
    return;
  }
  const media = value as Record<string, unknown>;
  if (media.url !== undefined && typeof media.url !== "string")
    push("error", `${path}.url`, "Hero media URL must be a string.");
  validateMediaTreatment(media, path, push);
  if (media.provenance !== undefined)
    validateMediaProvenance(media.provenance, `${path}.provenance`, push);
}

function validateElementContract(
  value: unknown,
  path: string,
  push: (level: ValidationIssue["level"], path: string, message: string) => void,
): void {
  if (value === undefined) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    push("error", path, "Element contract must be an object.");
    return;
  }
  const contract = value as Record<string, unknown>;
  for (const key of ["optional", "visible", "protected"]) {
    if (contract[key] !== undefined && typeof contract[key] !== "boolean")
      push("error", `${path}.${key}`, `Element contract ${key} must be boolean.`);
  }
}

function validateMediaTreatment(
  value: Record<string, unknown>,
  path: string,
  push: (level: ValidationIssue["level"], path: string, message: string) => void,
): void {
  for (const key of ["cropX", "cropY"]) {
    if (
      value[key] !== undefined &&
      (typeof value[key] !== "number" ||
        !Number.isFinite(value[key]) ||
        value[key] < 0 ||
        value[key] > 100)
    )
      push("error", `${path}.${key}`, `${key} must be a finite number between 0 and 100.`);
  }
  if (
    value.zoom !== undefined &&
    (typeof value.zoom !== "number" ||
      !Number.isFinite(value.zoom) ||
      value.zoom <= 0 ||
      value.zoom > 4)
  )
    push(
      "error",
      `${path}.zoom`,
      "zoom must be a finite number greater than 0 and no greater than 4.",
    );
  if (
    value.overlay !== undefined &&
    !["none", "soft", "medium", "intense"].includes(String(value.overlay))
  )
    push("error", `${path}.overlay`, "Unknown media overlay.");
  if (value.overlayColor !== undefined && typeof value.overlayColor !== "string")
    push("error", `${path}.overlayColor`, "overlayColor must be a string.");
}

function normalizeElementContract(value: unknown): Record<string, boolean> {
  const input =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    optional:
      typeof input.optional === "boolean" ? input.optional : DEFAULT_ELEMENT_CONTRACT.optional,
    visible:
      typeof input.visible === "boolean"
        ? input.visible
        : typeof input.enabled === "boolean"
          ? input.enabled
          : DEFAULT_ELEMENT_CONTRACT.visible,
    protected:
      typeof input.protected === "boolean" ? input.protected : DEFAULT_ELEMENT_CONTRACT.protected,
  };
}

function normalizeMediaTreatment(value: unknown): Record<string, unknown> {
  const input =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const numberOr = (candidate: unknown, fallback: number, min: number, max: number) =>
    typeof candidate === "number" && Number.isFinite(candidate)
      ? Math.min(max, Math.max(min, candidate))
      : fallback;
  const overlay = ["none", "soft", "medium", "intense"].includes(String(input.overlay))
    ? String(input.overlay)
    : DEFAULT_MEDIA_TREATMENT.overlay;
  return {
    ...input,
    cropX: numberOr(input.cropX, DEFAULT_MEDIA_TREATMENT.cropX, 0, 100),
    cropY: numberOr(input.cropY, DEFAULT_MEDIA_TREATMENT.cropY, 0, 100),
    zoom: numberOr(input.zoom, DEFAULT_MEDIA_TREATMENT.zoom, 0.1, 4),
    overlay,
    overlayColor:
      typeof input.overlayColor === "string"
        ? input.overlayColor
        : DEFAULT_MEDIA_TREATMENT.overlayColor,
  };
}

/**
 * Materializes the L0 defaults at the canonical import boundary. Existing
 * renderers intentionally ignore these new fields, so legacy visual output
 * remains unchanged until a later UI/rendering phase opts into them.
 */
export function normalizeCanonicalConfig(input: Record<string, unknown>): Record<string, unknown> {
  const config = structuredClone(input);
  if (config.profile && typeof config.profile === "object" && !Array.isArray(config.profile)) {
    const profile = config.profile as Record<string, unknown>;
    if (profile.avatar && typeof profile.avatar === "object" && !Array.isArray(profile.avatar)) {
      const avatar = profile.avatar as Record<string, unknown>;
      config.profile = {
        ...profile,
        avatar: {
          ...avatar,
          ...(avatar.media !== undefined ? { media: normalizeMediaTreatment(avatar.media) } : {}),
        },
      };
    }
  }
  const blocks = Array.isArray(config.blocks) ? config.blocks : [];
  config.blocks = blocks.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
    const block = raw as Record<string, unknown>;
    const content =
      block.content && typeof block.content === "object" && !Array.isArray(block.content)
        ? (block.content as Record<string, unknown>)
        : {};
    const normalized = {
      ...block,
      element: normalizeElementContract(block.element),
      content: { ...content },
    };
    for (const key of ["bannerImage", "backgroundImage", "media"]) {
      if (content[key] !== undefined)
        normalized.content[key] = normalizeMediaTreatment(content[key]);
    }
    if (content.avatar && typeof content.avatar === "object" && !Array.isArray(content.avatar))
      normalized.content.avatar = {
        ...(content.avatar as Record<string, unknown>),
        ...(content.avatar &&
        typeof (content.avatar as Record<string, unknown>).media === "object" &&
        !Array.isArray((content.avatar as Record<string, unknown>).media)
          ? {
              media: normalizeMediaTreatment((content.avatar as Record<string, unknown>).media),
            }
          : {}),
        element: normalizeElementContract((content.avatar as Record<string, unknown>).element),
      };
    for (const key of ["badge", "primaryCTA", "secondaryCTA"]) {
      const candidate = content[key];
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate))
        normalized.content[key] = {
          ...(candidate as Record<string, unknown>),
          element: normalizeElementContract((candidate as Record<string, unknown>).element),
        };
    }
    if (Array.isArray(content.products) || Array.isArray(content.items)) {
      for (const key of ["products", "items"]) {
        if (!Array.isArray(content[key])) continue;
        normalized.content[key] = (content[key] as unknown[]).map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return item;
          const record = item as Record<string, unknown>;
          return {
            ...record,
            element: normalizeElementContract(record.element),
            ...(record.badge !== undefined
              ? { badgeElement: normalizeElementContract(record.badgeElement) }
              : {}),
            ...(record.price !== undefined
              ? { priceElement: normalizeElementContract(record.priceElement) }
              : {}),
            ...(record.ctaLabel !== undefined || record.ctaUrl !== undefined
              ? { ctaElement: normalizeElementContract(record.ctaElement) }
              : {}),
          };
        });
      }
    }
    return normalized;
  });
  return config;
}

/**
 * validateTemplate — run before publishing and before importing JSON.
 * Detects duplicate ids, unknown block types, corrupt configs and missing
 * critical properties. Never throws; always returns a report.
 */
export function validateTemplate(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  const push = (level: ValidationIssue["level"], path: string, message: string) =>
    issues.push({ level, path, message });

  if (!input || typeof input !== "object") {
    return {
      valid: false,
      issues: [{ level: "error", path: "root", message: "Configuration is not an object." }],
    };
  }

  const config = input as Partial<BioTemplateConfig>;

  if (typeof config.schemaVersion !== "number") {
    push("error", "schemaVersion", "Missing schemaVersion.");
  } else if (config.schemaVersion > SCHEMA_VERSION) {
    push(
      "error",
      "schemaVersion",
      `Config was created with a newer schema (v${config.schemaVersion}).`,
    );
  }

  if (!config.pageInstanceId) push("error", "pageInstanceId", "Missing page instance id.");
  if (!config.templateDefinitionId)
    push("warning", "templateDefinitionId", "Missing template definition id.");
  if (!config.theme?.colors) push("error", "theme.colors", "Theme colors are missing.");
  if (!config.theme?.typography) push("error", "theme.typography", "Theme typography is missing.");
  if (!config.layout?.responsive)
    push("error", "layout.responsive", "Layout responsive rules are missing.");
  if (!config.profile?.name) push("warning", "profile.name", "Profile has no name.");
  if (!config.seo?.title)
    push("warning", "seo.title", "SEO title is empty — search engines will guess one.");
  if (config.profile?.avatar?.media !== undefined)
    validateMediaTreatment(
      config.profile.avatar.media as unknown as Record<string, unknown>,
      "profile.avatar.media",
      push,
    );

  if (!Array.isArray(config.blocks)) {
    push("error", "blocks", "Blocks must be an array.");
  } else {
    const seen = new Set<string>();
    config.blocks.forEach((block, index) => {
      const path = `blocks[${index}]`;
      if (!block?.id) {
        push("error", path, "Block has no id.");
        return;
      }
      if (seen.has(block.id)) push("error", path, `Duplicate block id "${block.id}".`);
      seen.add(block.id);
      if (!block.type || !(block.type in BlockRegistry)) {
        push("error", `${path}.type`, `Unknown block type "${String(block.type)}".`);
      }
      if (!block.visibility)
        push("warning", `${path}.visibility`, "Block has no responsive visibility.");
      const items = block.content?.items ?? [];
      items.forEach((item, i) => {
        if (item.url && !isValidUrl(item.url)) {
          push("warning", `${path}.content.items[${i}].url`, `"${item.url}" is not a valid URL.`);
        }
      });
      if (block.content?.url && !isValidUrl(block.content.url)) {
        push("warning", `${path}.content.url`, `"${block.content.url}" is not a valid URL.`);
      }
      validateHeroMedia(block.content?.bannerImage, `${path}.content.bannerImage`, push);
      validateHeroMedia(block.content?.backgroundImage, `${path}.content.backgroundImage`, push);
      validateMediaTreatment(
        (block.content?.media ?? {}) as unknown as Record<string, unknown>,
        `${path}.content.media`,
        push,
      );
      validateElementContract(block.element, `${path}.element`, push);
      validateElementContract(
        block.content?.avatar?.element,
        `${path}.content.avatar.element`,
        push,
      );
      if (block.content?.avatar?.media !== undefined)
        validateMediaTreatment(
          block.content.avatar.media as unknown as Record<string, unknown>,
          `${path}.content.avatar.media`,
          push,
        );
      validateElementContract(
        block.content?.badge && typeof block.content.badge === "object"
          ? block.content.badge.element
          : undefined,
        `${path}.content.badge.element`,
        push,
      );
      validateElementContract(
        block.content?.primaryCTA?.element,
        `${path}.content.primaryCTA.element`,
        push,
      );
      validateElementContract(
        block.content?.secondaryCTA?.element,
        `${path}.content.secondaryCTA.element`,
        push,
      );
      if (
        block.style?.fusion !== undefined &&
        !["none", "fade", "halo", "organic", "dominant"].includes(block.style.fusion)
      )
        push("error", `${path}.style.fusion`, "Unknown hero fusion mode.");
      block.content?.products?.forEach((product, itemIndex) => {
        validateElementContract(
          product.element,
          `${path}.content.products[${itemIndex}].element`,
          push,
        );
        validateElementContract(
          product.badgeElement,
          `${path}.content.products[${itemIndex}].badgeElement`,
          push,
        );
        validateElementContract(
          product.priceElement,
          `${path}.content.products[${itemIndex}].priceElement`,
          push,
        );
        validateElementContract(
          product.ctaElement,
          `${path}.content.products[${itemIndex}].ctaElement`,
          push,
        );
        if (product.imageProvenance !== undefined) {
          validateMediaProvenance(
            product.imageProvenance,
            `${path}.content.products[${itemIndex}].imageProvenance`,
            push,
          );
        }
      });
    });
  }

  return { valid: !issues.some((i) => i.level === "error"), issues };
}

/**
 * MIGRATIONS READY
 * Each migration lifts a config one schema version. Add new entries as the
 * schema evolves; `migrateConfig` walks them in order.
 */
export type Migration = (config: Record<string, unknown>) => Record<string, unknown>;

export const MIGRATIONS: Record<number, Migration> = {
  // 1: (config) => ({ ...config, schemaVersion: 2, /* v1 -> v2 changes */ }),
};

export function migrateConfig(input: Record<string, unknown>): Record<string, unknown> {
  let config = { ...input };
  let version = typeof config["schemaVersion"] === "number" ? config["schemaVersion"] : 1;
  while (version < SCHEMA_VERSION && MIGRATIONS[version]) {
    config = MIGRATIONS[version]!(config);
    version = typeof config["schemaVersion"] === "number" ? config["schemaVersion"] : version + 1;
  }
  return normalizeCanonicalConfig(config);
}

/** Parse + migrate + validate untrusted JSON before it enters the studio. */
export function parseTemplateJson(raw: string): {
  config?: BioTemplateConfig;
  result: ValidationResult;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      result: {
        valid: false,
        issues: [{ level: "error", path: "json", message: "Invalid JSON syntax." }],
      },
    };
  }
  const migrated = migrateConfig(parsed as Record<string, unknown>);
  const result = validateTemplate(migrated);
  return result.valid ? { config: migrated as unknown as BioTemplateConfig, result } : { result };
}
