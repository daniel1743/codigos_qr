import type { BioTemplateConfig, TemplateCategory } from "../types";

/**
 * AI Input Intent Model
 * Represents user design intent separately from final template config.
 */
export interface AIUserIntent {
  businessType: string;
  audience?: string;
  primaryGoal: "booking" | "sales" | "contact" | "portfolio" | "information";
  secondaryGoals?: string[];
  visualStyle:
    | "dark premium"
    | "clean minimal"
    | "bold editorial"
    | "friendly organic"
    | "corporate professional";
  colorPreference?: string;
  contentPriority?: string[];
  requiredCapabilities?: string[];
  preferredTemplateFamily?: TemplateCategory;
  rawQuery?: string;
}

/**
 * AI Protection Settings
 * Prevents AI from overwriting specific fields.
 */
export interface AIProtectionZones {
  preserveProfileName?: boolean;
  preserveProfileAvatar?: boolean;
  preserveSeoSlug?: boolean;
  preserveSpecificBlocks?: string[]; // array of block IDs
}

/**
 * AI Generation Modes
 */
export type AIGenerationMode = "generate" | "restyle" | "recompose" | "improve" | "adapt";

/**
 * AI Generation Contract
 * The expected JSON response from the AI provider.
 */
export interface AITemplateResponse {
  recipeId?: string; // If starting from a recipe
  themeId?: string; // If overriding theme
  layoutId?: string; // If overriding layout
  config?: Partial<BioTemplateConfig>; // The partial or full config
}

/**
 * AI Repair Result
 */
export interface AIRepairResult {
  config: BioTemplateConfig;
  repairsMade: string[];
  valid: boolean;
  errors: string[];
}
