import type { BioTemplateConfig, ValidationIssue, ValidationResult } from "../types";
import { SCHEMA_VERSION } from "../types";
import { BlockRegistry } from "./BlockRegistry";
import { isValidUrl } from "../utils";

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
  return config;
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
