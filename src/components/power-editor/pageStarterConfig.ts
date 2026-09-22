import type { PageType } from "../../types/database";
import type { BioTemplateConfig } from "../../premium-template-studio/types";
import { getTemplateDefinition } from "../../premium-template-studio/templates/definitions";

/**
 * Page creation keeps one canonical template registry. These definitions are
 * existing product templates; this map only chooses the appropriate starter
 * for the page's creation intent.
 */
export const PAGE_TYPE_STARTER_TEMPLATE_IDS: Record<PageType, string> = {
  landing: "modern-bento-003",
  promotion: "product-launch",
  menu: "menu-default-v1",
  campaign: "product-launch",
  event: "dj-events",
  services: "professional-trust",
  catalog: "catalog-default-v1",
  portfolio: "portfolio-bento",
};

const FALLBACK_STARTER_TEMPLATE_ID = PAGE_TYPE_STARTER_TEMPLATE_IDS.landing;

const PAGE_TYPE_DEFAULT_SHOW_AVATAR: Partial<Record<PageType, boolean>> = {
  promotion: false,
  menu: false,
  campaign: false,
  event: false,
  services: true,
  catalog: false,
  portfolio: true,
};

/**
 * Build a valid child-page starter from the selected page type. The fallback
 * is explicit for future/legacy values and still preserves the user's title.
 */
export function createPageStarterConfig(title: string, pageType: PageType): BioTemplateConfig {
  const templateId = PAGE_TYPE_STARTER_TEMPLATE_IDS[pageType] ?? FALLBACK_STARTER_TEMPLATE_ID;
  const config = getTemplateDefinition(templateId).build();
  const safeTitle = title.trim();
  const defaultShowAvatar = PAGE_TYPE_DEFAULT_SHOW_AVATAR[pageType];
  const blocks = config.blocks.map((block) =>
    block.type === "hero"
      ? {
          ...block,
          content: { ...block.content, title: safeTitle },
        }
      : block,
  );

  return {
    ...config,
    blocks,
    metadata: { ...config.metadata, name: safeTitle },
    profile: {
      ...config.profile,
      name: safeTitle,
      ...(defaultShowAvatar === undefined ? {} : { showAvatar: defaultShowAvatar }),
    },
  };
}
