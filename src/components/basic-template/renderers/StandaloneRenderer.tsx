import type { BasicTemplateRendererProps } from "@/types/basic-templates";
import TemplateAmanda from "./TemplateAmanda";
import TemplateAdriana from "./TemplateAdriana";
import TemplateEudora from "./TemplateEudora";
import TemplateBarbara from "./TemplateBarbara";
import Template03, { type Template03IconType } from "./Template03";
import Template04, { type Template04SocialType } from "./Template04";
import Template05, { type Template05SocialType } from "./Template05";
import Template06, { type Template06SocialType } from "./Template06";
import Template07, { type Template07CardIcon, type Template07SocialType } from "./Template07";
import Template08, { type Template08LinkType } from "./Template08";
import { buildStandaloneStyle } from "./standaloneStyle";

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
  const standaloneStyle = buildStandaloneStyle(config);

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
    bannerUrl: profile.heroUrl,
  };

  const footerText = profile.footerEnabled ? profile.footerText || "" : "";
  const emailSocial = content.contact.email
    ? [{ type: "email" as const, url: `mailto:${content.contact.email}`, label: "Email" }]
    : [];
  const studioCards = content.cards
    .filter((card) => card.enabled)
    .map((card, index) => ({
      id: card.id,
      icon: (["calendar", "document", "gallery", "location"] as const)[index % 4],
      title: card.title,
      description: card.description,
      url: card.ctaUrl,
    }));
  const fitnessCards = content.cards
    .filter((card) => card.enabled)
    .map((card, index) => ({
      id: card.id,
      icon: (["dumbbell", "person", "leaf", "gift", "heart", "star"] as const)[index % 6] as Template07CardIcon,
      title: card.title,
      description: card.description,
      url: card.ctaUrl,
      highlight: index === 0,
    }));
  const neonCards = content.cards
    .filter((card) => card.enabled)
    .map((card, index) => ({
      id: card.id,
      type: (["website", "blog", "twitter", "instagram", "youtube", "email", "github", "linkedin"] as const)[index % 8] as Template08LinkType,
      title: card.title,
      subtitle: card.description,
      url: card.ctaUrl,
      highlight: index === 0,
    }));
  const newsletterLink = links.find((link) => /newsletter|suscrib|inscri/i.test(link.label)) ?? links[0];

  switch (template.id) {
    case "amanda":
      return (
        <TemplateAmanda
          {...common}
          standaloneStyle={standaloneStyle}
          links={links}
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />
      );
    case "adriana":
      return (
        <TemplateAdriana
          {...common}
          standaloneStyle={standaloneStyle}
          links={links}
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />
      );
    case "eudora":
      return (
        <TemplateEudora
          {...common}
          standaloneStyle={standaloneStyle}
          links={links}
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />
      );
    case "barbara":
      return (
        <TemplateBarbara
          {...common}
          standaloneStyle={standaloneStyle}
          services={services}
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />
      );
    case "studio":
      return (
        <Template03
          name={profile.name}
          profession={profile.subtitle}
          description={profile.bio}
          heroUrl={profile.heroUrl}
          monogram={profile.name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "ST"}
          cards={studioCards}
          socials={content.socials
            .filter(({ platform }) => ["whatsapp", "instagram", "website"].includes(platform))
            .map((social) => ({
              type: social.platform as Template03IconType,
              url: social.url,
              label: social.platform,
            }))}
          footerText={footerText}
          standaloneStyle={standaloneStyle}
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />
      );
    case "classic-bio":
      return (
        <Template04
          {...common}
          socials={[
            ...content.socials
              .filter(({ platform }) => ["instagram", "facebook", "linkedin", "twitter", "youtube", "tiktok"].includes(platform))
              .map((social) => ({
                type: social.platform as Template04SocialType,
                url: social.url,
                label: social.platform,
              })),
            ...emailSocial,
          ]}
          links={links}
          gallery={content.cards
            .filter((card) => card.enabled && Boolean(card.imageUrl))
            .map((card) => ({ id: card.id, imageUrl: card.imageUrl, url: card.ctaUrl, alt: card.title }))}
          footerText={footerText}
          standaloneStyle={standaloneStyle}
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />
      );
    case "sage":
      return (
        <Template05
          {...common}
          socials={[
            ...content.socials
              .filter(({ platform }) => ["tiktok", "youtube", "twitter", "facebook", "instagram"].includes(platform))
              .map((social) => ({
                type: social.platform as Template05SocialType,
                url: social.url,
                label: social.platform,
              })),
            ...emailSocial,
          ]}
          links={links}
          footerText={footerText}
          standaloneStyle={standaloneStyle}
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />
      );
    case "silver":
      return (
        <Template06
          {...common}
          socials={[
            ...content.socials
              .filter(({ platform }) => ["youtube", "facebook", "tiktok", "twitter", "instagram", "website"].includes(platform))
              .map((social) => ({
                type: social.platform as Template06SocialType,
                url: social.url,
                label: social.platform,
              })),
            ...emailSocial,
          ]}
          links={links}
          footerText={footerText}
          standaloneStyle={standaloneStyle}
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />
      );
    case "fitness":
      return (
        <Template07
          {...common}
          socials={[
            ...content.socials
              .filter(({ platform }) => ["instagram", "tiktok", "youtube", "whatsapp", "website"].includes(platform))
              .map((social) => ({
                type: social.platform as Template07SocialType,
                url: social.url,
                label: social.platform,
              })),
            ...emailSocial,
          ]}
          cards={fitnessCards}
          newsletterTitle="Únete a mi comunidad"
          newsletterSubtitle="Recibe novedades, consejos y próximos eventos."
          newsletterUrl={newsletterLink?.url || "#"}
          newsletterButtonLabel={newsletterLink?.label || "Suscríbete"}
          footerText={footerText}
          standaloneStyle={standaloneStyle}
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />
      );
    case "neon":
      return (
        <Template08
          name={profile.name}
          profession={profile.subtitle}
          description={profile.bio}
          avatarUrl={profile.avatarUrl}
          socials={[
            ...content.socials
              .filter(({ platform }) => ["website", "twitter", "instagram", "youtube", "github", "linkedin"].includes(platform))
              .map((social) => ({
                type: social.platform as Template08LinkType,
                url: social.url,
                label: social.platform,
              })),
            ...emailSocial,
          ]}
          cards={neonCards}
          footerText={footerText}
          standaloneStyle={standaloneStyle}
          targetRegistry={targetRegistry}
          highlightedTarget={highlightedTarget}
        />
      );
    default:
      return null;
  }
}
