/**
 * CRIPQER SMART PAGES V1 — Engine V2 adapter boundary.
 *
 * IMPORTANT: this file does NOT integrate the real Cripqer Engine V2 and does
 * not define BioTemplateConfig. It only declares the typed boundary and ships
 * a mock adapter so the sandbox can be previewed end to end.
 *
 *   PageGenerationRequest / PagePlanV1
 *              ↓
 *        EngineV2Adapter          <-- host implements this
 *              ↓
 *   Host Engine V2 -> canonical page document -> Power Editor 2
 */

import type { NormalizedContentV1 } from "./catalog.types";
import type { PageGenerationRequest, PagePlanV1, RuntimePageConfigV1 } from "./smart-pages.types";
import { buildRuntimeConfig } from "./page-orchestrator";

/** Neutral host-engine input. The host maps this onto its own engine intent. */
export interface EngineV2Input {
  version: "1";
  businessType: string;
  goal: PageGenerationRequest["goal"];
  density: PageGenerationRequest["density"];
  experienceType: PagePlanV1["experienceType"];
  identity: { name: string; tagline?: string; about?: string };
  sections: Array<{ kind: string; order: number; title?: string }>;
  cta: { primary: string; secondary: string[] };
  assets: { hasLogo: boolean; hasCover: boolean; hasItemMedia: boolean; hasGallery: boolean };
  counts: { items: number; categories: number; team: number; testimonials: number; faq: number };
}

export interface EngineV2Adapter {
  id: string;
  /** false for the bundled mock — never claim real Engine V2 integration. */
  isRealEngine: boolean;
  toEngineInput(plan: PagePlanV1, request: PageGenerationRequest): EngineV2Input;
  /**
   * The host implementation calls the real Engine V2 and returns its canonical
   * page document. The mock returns a runtime config instead.
   */
  render(plan: PagePlanV1, content: NormalizedContentV1): Promise<RuntimePageConfigV1>;
}

export function toEngineV2Input(plan: PagePlanV1, request: PageGenerationRequest): EngineV2Input {
  const content = request.content;
  const items = content.catalogs.flatMap((c) => c.items);
  const identity: EngineV2Input["identity"] = { name: content.business.name };
  if (content.business.tagline) identity.tagline = content.business.tagline;
  if (content.business.about) identity.about = content.business.about;

  return {
    version: "1",
    businessType: request.businessType,
    goal: request.goal,
    density: request.density,
    experienceType: plan.experienceType,
    identity,
    sections: plan.sections.map((s) => {
      const out: EngineV2Input["sections"][number] = { kind: s.kind, order: s.order };
      if (s.title) out.title = s.title;
      return out;
    }),
    cta: {
      primary: plan.ctaHierarchy.primary.kind,
      secondary: plan.ctaHierarchy.secondary.map((a) => a.kind),
    },
    assets: {
      hasLogo: Boolean(content.business.logo),
      hasCover: Boolean(content.business.cover),
      hasItemMedia: items.some((i) => i.media.length > 0),
      hasGallery: content.gallery.length > 0,
    },
    counts: {
      items: items.length,
      categories: content.catalogs.reduce((n, c) => n + c.categories.length, 0),
      team: content.team.length,
      testimonials: content.testimonials.length,
      faq: content.faq.length,
    },
  };
}

/** Sandbox/demo adapter: renders through the Master Runtime, not Engine V2. */
export const mockEngineV2Adapter: EngineV2Adapter = {
  id: "mock-runtime-adapter",
  isRealEngine: false,
  toEngineInput: toEngineV2Input,
  async render(plan, content) {
    return buildRuntimeConfig(plan, content);
  },
};
