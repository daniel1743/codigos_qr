import type { ComponentType } from "react";
import type {
  BasicTemplateRendererProps,
  TemplateFamily,
} from "@/types/basic-templates";
import { CorporateRenderer } from "./renderers/CorporateRenderer";
import { HeroCardsRenderer } from "./renderers/HeroCardsRenderer";
import { HeroProfileRenderer } from "./renderers/HeroProfileRenderer";

/**
 * Dispatcher: picks the family renderer based on the template definition.
 * One renderer per family — templates are declarative, not duplicated.
 */
const FAMILY_RENDERERS: Record<TemplateFamily, ComponentType<BasicTemplateRendererProps>> = {
  hero_profile: HeroProfileRenderer,
  hero_cards: HeroCardsRenderer,
  professional_corporate: CorporateRenderer,
};

export function BasicTemplateRenderer(props: BasicTemplateRendererProps) {
  const Renderer = FAMILY_RENDERERS[props.config.template.family];
  return <Renderer {...props} />;
}
