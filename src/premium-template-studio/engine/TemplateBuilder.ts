import { SCHEMA_VERSION } from "../types";
import type {
  BioTemplateConfig,
  TemplateBlock,
  TemplateCategory,
  TemplateLayout,
  TemplateProfile,
  TemplateTheme,
} from "../types";
import { deepClone, formatSlug, uid } from "../utils";

/**
 * TEMPLATE COMPOSITION
 *
 *   BASE TEMPLATE + LAYOUT + THEME + CONTENT + USER OVERRIDES = FINAL TEMPLATE
 *
 * buildTemplate is the single place where a config is assembled, so the same
 * composition rules apply to hand-made templates, presets and AI generation.
 */

export const DEFAULT_PROFILE: TemplateProfile = {
  name: "Your name",
  username: "yourname",
  role: "",
  company: "",
  location: "",
  description: "",
  verified: false,
  avatar: { size: 96, radius: 999, borderWidth: 4, shadow: true, overlap: 48, align: "center" },
  banner: {
    enabled: true,
    height: 190,
    mobileHeight: 140,
    overlay: 0.15,
    blur: 0,
    gradient: true,
    focalX: 50,
    focalY: 50,
    radius: 18,
  },
};

export interface BuildTemplateInput {
  templateDefinitionId: string;
  name: string;
  category: TemplateCategory;
  premium?: boolean;
  theme: TemplateTheme;
  layout: TemplateLayout;
  profile?: Partial<TemplateProfile>;
  blocks: TemplateBlock[];
  /** deep partial overrides applied last (user customisation, brand kit, AI) */
  overrides?: Partial<BioTemplateConfig>;
  pageInstanceId?: string;
}

export function buildTemplate(input: BuildTemplateInput): BioTemplateConfig {
  const now = new Date().toISOString();
  const profile: TemplateProfile = {
    ...deepClone(DEFAULT_PROFILE),
    ...(input.profile ?? {}),
    avatar: { ...DEFAULT_PROFILE.avatar, ...(input.profile?.avatar ?? {}) },
    banner: { ...DEFAULT_PROFILE.banner, ...(input.profile?.banner ?? {}) },
  };

  const config: BioTemplateConfig = {
    schemaVersion: SCHEMA_VERSION,
    pageInstanceId: input.pageInstanceId ?? uid("bio"),
    templateDefinitionId: input.templateDefinitionId,
    metadata: {
      templateDefinitionId: input.templateDefinitionId,
      name: input.name,
      category: input.category,
      premium: input.premium ?? false,
      createdAt: now,
      updatedAt: now,
    },
    theme: deepClone(input.theme),
    layout: deepClone(input.layout),
    profile,
    blocks: deepClone(input.blocks),
    seo: {
      title: `${profile.name}${profile.role ? ` — ${profile.role}` : ""}`,
      description: profile.description || `${profile.name} on the web.`,
      index: true,
    },
    settings: {
      showBranding: true,
      slug: formatSlug(profile.username || profile.name),
      animation: input.theme.animation,
      language: "en",
    },
  };

  return mergeConfig(config, input.overrides);
}

/** Shallow-per-section merge: enough for overrides, still fully serializable. */
export function mergeConfig(
  config: BioTemplateConfig,
  overrides?: Partial<BioTemplateConfig>,
): BioTemplateConfig {
  if (!overrides) return config;
  return {
    ...config,
    ...overrides,
    metadata: { ...config.metadata, ...(overrides.metadata ?? {}) },
    theme: { ...config.theme, ...(overrides.theme ?? {}) },
    layout: { ...config.layout, ...(overrides.layout ?? {}) },
    profile: { ...config.profile, ...(overrides.profile ?? {}) },
    seo: { ...config.seo, ...(overrides.seo ?? {}) },
    settings: { ...config.settings, ...(overrides.settings ?? {}) },
    blocks: overrides.blocks ?? config.blocks,
  };
}

/** Duplicate a page instance: new instance id, new block ids, same design. */
export function duplicateTemplate(config: BioTemplateConfig, name?: string): BioTemplateConfig {
  const copy = deepClone(config);
  copy.pageInstanceId = uid("bio");
  copy.blocks = copy.blocks.map((block) => ({ ...block, id: uid("block") }));
  copy.metadata = {
    ...copy.metadata,
    name: name ?? `${copy.metadata.name} copy`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return copy;
}
