import type { BioTemplateConfig, TemplateBlock, TemplateProfile } from "../types";
import { getLayout } from "../constants/layouts";
import { getTheme } from "../constants/themes";
import { buildTemplate, mergeConfig } from "./TemplateBuilder";
import { getTemplateDefinition } from "../templates/definitions";
import { deepClone, uid } from "../utils";

/**
 * FUTURE AI GENERATION POINT
 *
 * createTemplate({ base, layout, theme, content }) is the single entry point an
 * AI (or a marketplace, or a brand kit) needs. It returns a fully serializable
 * BioTemplateConfig — never React code.
 */
export interface CreateTemplateInput {
  /** template definition id, e.g. "creator-premium-001" */
  base: string;
  layout?: string | undefined;
  theme?: string | undefined;
  profile?: Partial<TemplateProfile> | undefined;
  blocks?: TemplateBlock[] | undefined;
  overrides?: Partial<BioTemplateConfig> | undefined;
  pageInstanceId?: string | undefined;
}

export function createTemplate(input: CreateTemplateInput): BioTemplateConfig {
  const definition = getTemplateDefinition(input.base);
  const source = definition.build();

  const config = buildTemplate({
    templateDefinitionId: definition.id,
    name: definition.name,
    category: definition.category,
    premium: definition.premium,
    theme: input.theme ? getTheme(input.theme) : source.theme,
    layout: input.layout ? getLayout(input.layout) : source.layout,
    profile: { ...source.profile, ...(input.profile ?? {}) },
    blocks: input.blocks ?? deepClone(source.blocks),
    pageInstanceId: input.pageInstanceId ?? uid("bio"),
  });

  return mergeConfig(config, input.overrides);
}

/**
 * Apply a different template definition to an existing page while keeping the
 * user's own profile content — the core of "try another template".
 */
export function applyTemplateDefinition(
  current: BioTemplateConfig,
  definitionId: string,
  keepContent = true,
): BioTemplateConfig {
  const next = getTemplateDefinition(definitionId).build();
  if (!keepContent) return { ...next, pageInstanceId: current.pageInstanceId };
  return {
    ...next,
    pageInstanceId: current.pageInstanceId,
    profile: {
      ...next.profile,
      name: current.profile.name,
      username: current.profile.username,
      role: current.profile.role ?? "",
      company: current.profile.company ?? "",
      location: current.profile.location ?? "",
      description: current.profile.description ?? "",
      avatarUrl: current.profile.avatarUrl ?? next.profile.avatarUrl ?? "",
      verified: current.profile.verified ?? false,
    },
    seo: current.seo,
    settings: { ...next.settings, slug: current.settings.slug },
  };
}
