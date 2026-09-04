import { BLOCK_DEFINITIONS } from "../constants/blockDefinitions";
import { SECTION_PRESETS } from "../constants/sectionPresets";
import { THEMES } from "../constants/themes";
import { LAYOUTS } from "../constants/layouts";
import { MOTION_PRESETS } from "../constants/motionPresets";
import { TEMPLATE_DEFINITIONS } from "../templates/definitions";
import { uid, deepClone } from "../utils";
import type { BioTemplateConfig, TemplateBlock } from "../types";
import type { AIUserIntent, AIProtectionZones, AIRepairResult } from "./types";

type MutableRecord = { [key: string]: unknown };
interface MutableLayout extends MutableRecord {
  colSpan?: unknown;
}
interface MutableBlock extends MutableRecord {
  id?: unknown;
  type?: unknown;
  variant?: unknown;
  content?: MutableRecord;
  style?: MutableRecord;
  layout?: MutableLayout;
}
interface MutableConfig extends MutableRecord {
  schemaVersion?: unknown;
  pageInstanceId?: unknown;
  templateDefinitionId?: unknown;
  metadata?: unknown;
  theme?: unknown;
  layout?: unknown;
  profile?: unknown;
  blocks?: unknown[];
  seo?: unknown;
  settings?: unknown;
}

function isMutableRecord(value: unknown): value is MutableRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMutableBlock(value: unknown): value is MutableBlock {
  return isMutableRecord(value);
}

function isRepairedConfig(value: MutableConfig): value is MutableConfig & BioTemplateConfig {
  return (
    typeof value.schemaVersion === "number" &&
    typeof value.pageInstanceId === "string" &&
    typeof value.templateDefinitionId === "string" &&
    isMutableRecord(value.metadata) &&
    isMutableRecord(value.theme) &&
    isMutableRecord(value.layout) &&
    isMutableRecord(value.profile) &&
    Array.isArray(value.blocks) &&
    value.blocks.every(
      (block): block is TemplateBlock =>
        isMutableBlock(block) &&
        typeof block.id === "string" &&
        typeof block.type === "string" &&
        typeof block.variant === "string" &&
        isMutableRecord(block.content) &&
        isMutableRecord(block.style) &&
        isMutableRecord(block.layout),
    ) &&
    isMutableRecord(value.seo) &&
    isMutableRecord(value.settings)
  );
}

/**
 * Creates a capability catalog for AI providers.
 */
export function getTemplateCapabilities() {
  return {
    blocks: BLOCK_DEFINITIONS.map((d) => ({
      type: d.type,
      name: d.name,
      variants: d.variants,
      group: d.group,
    })),
    sectionPresets: SECTION_PRESETS.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      previewType: p.previewType,
    })),
    recipes: TEMPLATE_DEFINITIONS.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      themeId: t.themeId,
    })),
    themes: THEMES.map((t) => ({
      id: t.id,
      name: t.name,
    })),
    layouts: LAYOUTS.map((l) => ({
      id: l.id,
      name: l.name,
    })),
    motionPresets: Object.keys(MOTION_PRESETS),
  };
}

/**
 * Returns suitable Recipe IDs based on structured intent.
 */
export function recommendTemplateRecipes(intent: AIUserIntent): string[] {
  const matches = TEMPLATE_DEFINITIONS.filter((t) => {
    // Exact category match
    if (intent.preferredTemplateFamily && t.category === intent.preferredTemplateFamily)
      return true;

    // Fuzzy matching based on business type
    const biz = intent.businessType.toLowerCase();
    if (t.category.toLowerCase().includes(biz)) return true;
    if (t.name.toLowerCase().includes(biz)) return true;

    // Goals mapping to categories
    if (
      intent.primaryGoal === "booking" &&
      (t.category === "Medical" || t.category === "Barber / Beauty")
    )
      return true;
    if (intent.primaryGoal === "sales" && t.category === "Store / Product") return true;
    if (intent.primaryGoal === "portfolio" && t.category === "Portfolio") return true;

    return false;
  });

  if (matches.length > 0) {
    return matches.slice(0, 3).map((t) => t.id);
  }

  // Fallback to safe generic options
  return ["creator-premium-001", "executive-premium-002", "modern-bento-003"];
}

/**
 * Safe Config Normalization
 */
export function normalizeTemplateConfig(
  candidate: Partial<BioTemplateConfig>,
  currentConfig?: BioTemplateConfig,
  protection?: AIProtectionZones,
): BioTemplateConfig {
  // Use a fallback config as a base if no currentConfig is provided
  const baseConfig = currentConfig ? deepClone(currentConfig) : TEMPLATE_DEFINITIONS[0]!.build();

  // Merge top level simple properties safely
  if (candidate.theme) baseConfig.theme = { ...baseConfig.theme, ...candidate.theme };
  if (candidate.layout) baseConfig.layout = { ...baseConfig.layout, ...candidate.layout };
  if (candidate.motion) baseConfig.motion = { ...baseConfig.motion, ...candidate.motion };
  if (candidate.seo) baseConfig.seo = { ...baseConfig.seo, ...candidate.seo };

  // Profile protection
  if (candidate.profile) {
    baseConfig.profile = { ...baseConfig.profile, ...candidate.profile };
    if (protection?.preserveProfileName && currentConfig)
      baseConfig.profile.name = currentConfig.profile.name;
    if (protection?.preserveProfileAvatar && currentConfig) {
      if (currentConfig.profile.avatarUrl !== undefined) {
        baseConfig.profile.avatarUrl = currentConfig.profile.avatarUrl;
      } else {
        delete baseConfig.profile.avatarUrl;
      }
    }
  }

  // Blocks processing
  if (Array.isArray(candidate.blocks)) {
    const validBlockTypes = new Set(BLOCK_DEFINITIONS.map((d) => d.type));

    const preservedBlocks =
      currentConfig && protection?.preserveSpecificBlocks
        ? currentConfig.blocks.filter((b) => protection.preserveSpecificBlocks?.includes(b.id))
        : [];

    const newBlocks = candidate.blocks
      .filter((b): b is TemplateBlock =>
        Boolean(b && typeof b === "object" && typeof b.type === "string"),
      )
      .filter((b) => validBlockTypes.has(b.type))
      .map((b) => {
        // Find existing definition for variant validation
        const def = BLOCK_DEFINITIONS.find((d) => d.type === b.type);
        const variant = def?.variants.includes(b.variant)
          ? b.variant
          : def?.variants[0] || "default";

        return {
          ...b,
          id: b.id || uid("block"), // Repair missing IDs
          type: b.type,
          variant,
          content: b.content || {},
          layout: b.layout || { aspect: "auto" },
          style: b.style || {},
        };
      });

    // Merge preserved blocks and new blocks
    baseConfig.blocks = [...preservedBlocks, ...newBlocks];
  }

  return baseConfig;
}

/**
 * AI config validation pipeline. Returns errors or valid state.
 */
export function validateAndNormalizeConfig(
  candidate: unknown,
  currentConfig?: BioTemplateConfig,
  protection?: AIProtectionZones,
): { valid: boolean; errors: string[]; config?: BioTemplateConfig } {
  const errors: string[] = [];

  if (!candidate || typeof candidate !== "object") {
    errors.push("Candidate config must be an object.");
    return { valid: false, errors };
  }

  try {
    const config = normalizeTemplateConfig(candidate, currentConfig, protection);
    return { valid: true, errors: [], config };
  } catch (err: unknown) {
    errors.push(`Normalization failed: ${err instanceof Error ? err.message : String(err)}`);
    return { valid: false, errors };
  }
}

/**
 * Safe config repair helper for recoverable mistakes
 */
export function repairTemplateConfig(candidate: unknown): AIRepairResult {
  const repairsMade: string[] = [];
  const errors: string[] = [];
  let valid = true;

  if (!candidate || typeof candidate !== "object") {
    return {
      config: TEMPLATE_DEFINITIONS[0]!.build(),
      repairsMade,
      valid: false,
      errors: ["Invalid root object"],
    };
  }

  // Start with a safe clone and keep unknown input behind a runtime boundary.
  const cloned = deepClone(candidate);
  if (!isMutableRecord(cloned)) {
    return {
      config: TEMPLATE_DEFINITIONS[0]!.build(),
      repairsMade,
      valid: false,
      errors: ["Invalid root object"],
    };
  }
  const config = cloned as MutableConfig;

  // 1. Repair blocks array if missing
  if (!Array.isArray(config.blocks)) {
    config.blocks = [];
    repairsMade.push("Initialized empty blocks array");
  }

  // 2. Repair individual blocks
  const validBlockTypes = new Set(BLOCK_DEFINITIONS.map((d) => d.type));

  config.blocks = config.blocks.filter(
    (candidateBlock: unknown): candidateBlock is MutableBlock => {
      if (!isMutableBlock(candidateBlock)) return false;
      const b = candidateBlock;

      if (typeof b.id !== "string" || !b.id) {
        b.id = uid("block");
        repairsMade.push("Generated missing block ID");
      }

      if (typeof b.type !== "string" || !validBlockTypes.has(b.type as TemplateBlock["type"])) {
        errors.push(`Removed unsupported block type: ${b.type}`);
        valid = false;
        return false; // Remove invalid blocks
      }

      const blockType = b.type as TemplateBlock["type"];
      const def = BLOCK_DEFINITIONS.find((d) => d.type === blockType);
      if (typeof b.variant !== "string" || !def?.variants.includes(b.variant)) {
        b.variant = def?.variants[0] || "default";
        repairsMade.push(`Reset invalid variant for block ${blockType}`);
      }

      if (!isMutableRecord(b.content)) {
        b.content = {};
        repairsMade.push(`Initialized empty content for block ${blockType}`);
      }

      if (!isMutableRecord(b.layout)) {
        b.layout = { aspect: "auto" };
        repairsMade.push(`Initialized default layout for block ${blockType}`);
      } else if (typeof b.layout.colSpan === "number") {
        // Validate colSpan bounds
        if (b.layout.colSpan < 1 || b.layout.colSpan > 12) {
          b.layout.colSpan = 12;
          repairsMade.push(`Clamped colSpan to valid range (1-12) for block ${blockType}`);
        }
      }

      // Safety: Strip unsafe URLs from content
      const content = b.content as MutableRecord;
      for (const key in content) {
        const val = content[key];
        if (typeof val === "string" && val.trim().toLowerCase().startsWith("javascript:")) {
          content[key] = "#";
          repairsMade.push(`Stripped unsafe URL from block ${blockType}`);
        }
      }

      return true;
    },
  );

  if (!isRepairedConfig(config)) {
    return {
      config: TEMPLATE_DEFINITIONS[0]!.build(),
      repairsMade,
      valid: false,
      errors: [...errors, "Repaired config is missing required fields"],
    };
  }

  return { config, repairsMade, valid, errors };
}
