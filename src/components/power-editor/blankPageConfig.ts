import type { BioTemplateConfig } from "../../premium-template-studio/types";
import { buildTemplate } from "../../premium-template-studio/engine/TemplateBuilder";
import { getTheme } from "../../premium-template-studio/constants/themes";
import { getLayout } from "../../premium-template-studio/constants/layouts";

/**
 * TRUE BLANK PAGE INITIALIZER.
 *
 * Produces a minimal, valid BioTemplateConfig with no demo persona, no fake
 * links/portfolio/social/documents, and no foreign avatar/banner. Only the
 * page title is seeded. This replaces PAGES_2's `createDemoConfig()` bootstrap.
 *
 * `page_type` is intentionally metadata/creation intent only — it does NOT
 * produce a separate renderer schema.
 */
export function createBlankPageConfig(title: string, _pageType?: string): BioTemplateConfig {
  const safeTitle = (title ?? "").trim() || "Página sin título";
  return buildTemplate({
    templateDefinitionId: "blank-page",
    name: safeTitle,
    category: "Minimal",
    premium: false,
    theme: getTheme("aurora"),
    layout: getLayout("centered"),
    profile: {
      name: safeTitle,
      username: "",
      role: "",
      company: "",
      location: "",
      description: "",
    },
    blocks: [],
  });
}
