import type { BasicTemplateRendererProps } from "@/types/basic-templates";
import TemplateAmanda from "./TemplateAmanda";
import TemplateAdriana from "./TemplateAdriana";
import TemplateEudora from "./TemplateEudora";
import TemplateBarbara from "./TemplateBarbara";

/**
 * "standalone" family renderer.
 *
 * These templates are pre-approved, self-contained components (inline CSS + SVG)
 * that do not follow the declarative primitive system. This adapter maps the
 * shared `BasicTemplateContent` onto each template's own approved props,
 * preserving each design's identity. Colors / logo / footer keep the template
 * defaults (they are part of the approved design).
 */
export function StandaloneRenderer({ config, targetRegistry, highlightedTarget }: BasicTemplateRendererProps) {
  const { template, content } = config;
  const { profile } = content;

  const links = content.links
    .filter((link) => link.enabled)
    .map((link) => ({ id: link.id, label: link.label, url: link.url }));

  const services = content.cards
    .filter((card) => card.enabled)
    .map((card) => ({
      id: card.id,
      label: card.title,
      url: card.ctaUrl,
      description: card.description,
      imageUrl: card.imageUrl,
    }));

  const common = {
    name: profile.name,
    profession: profile.subtitle,
    description: profile.bio,
    avatarUrl: profile.avatarUrl,
    backgroundUrl: profile.heroUrl,
  };

  switch (template.id) {
    case "amanda":
      return (
        <TemplateAmanda
          {...common}
          links={links}
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />
      );
    case "adriana":
      return (
        <TemplateAdriana
          {...common}
          links={links}
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />
      );
    case "eudora":
      return (
        <TemplateEudora
          {...common}
          links={links}
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />
      );
    case "barbara":
      return (
        <TemplateBarbara
          {...common}
          services={services}
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />
      );
    default:
      return null;
  }
}
