import { createBlankPageConfig } from "../power-editor/blankPageConfig";
import { getLayout } from "../../premium-template-studio/constants/layouts";
import { getTheme } from "../../premium-template-studio/constants/themes";
import type { BioTemplateConfig, TemplateBlock } from "../../premium-template-studio/types";

const MAGIC_HERO_IMAGE =
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80";

function block(
  id: string,
  type: TemplateBlock["type"],
  variant: string,
  content: TemplateBlock["content"],
  layout: TemplateBlock["layout"] = {},
  style: TemplateBlock["style"] = {},
): TemplateBlock {
  return {
    id,
    type,
    variant,
    content,
    style,
    layout: { width: "content", align: "center", span: 2, ...layout },
    visibility: { desktop: true, tablet: true, mobile: true },
    interaction: { animation: "soft-rise", newTab: true },
  };
}

/** Initial one-page Business/Services pilot document for empty child pages. */
export function createMagicServicesConfig(title: string): BioTemplateConfig {
  const base = createBlankPageConfig(title, "services");
  return {
    ...base,
    templateDefinitionId: "magic-business-services-pilot-v1",
    metadata: {
      ...base.metadata,
      templateDefinitionId: "magic-business-services-pilot-v1",
      name: title,
      category: "Business",
      premium: true,
    },
    theme: getTheme("aurora"),
    layout: getLayout("editorial"),
    profile: {
      ...base.profile,
      name: title,
      role: "Servicios profesionales",
      description: "Una página clara para presentar servicios, confianza y contacto.",
      banner: {
        ...base.profile.banner,
        enabled: true,
        imageUrl: MAGIC_HERO_IMAGE,
        height: 220,
        mobileHeight: 170,
        overlay: 0.2,
      },
    },
    blocks: [
      block(
        "magic-hero",
        "hero",
        "editorial",
        {
          eyebrow: "SERVICIOS",
          title,
          subtitle: "Soluciones con intención y resultados medibles.",
          description: "Edita este texto directamente sobre la página y publica cuando esté listo.",
          bannerImage: { url: MAGIC_HERO_IMAGE, fit: "cover", position: "center" },
          primaryCTA: { label: "Hablemos", url: "mailto:hola@ejemplo.com" },
        },
        { width: "wide", align: "left" },
      ),
      block("magic-intro", "text", "default", {
        title: "Una experiencia directa",
        body: "Tu página permanece visible mientras ajustas el contenido, el estilo y la estructura.",
      }),
      block("magic-links", "links", "cards", {
        title: "Enlaces rápidos",
        items: [
          { id: "magic-link-contact", label: "Agendar una conversación", url: "#contacto" },
          { id: "magic-link-work", label: "Ver proyectos", url: "#servicios" },
        ],
      }),
      block("magic-services", "services", "cards", {
        title: "Servicios",
        description: "Presenta aquí tus servicios principales.",
        items: [
          {
            id: "magic-service-1",
            title: "Estrategia",
            description: "Ordenamos prioridades y definimos el siguiente paso.",
            ctaLabel: "Consultar",
            ctaUrl: "#contacto",
          },
          {
            id: "magic-service-2",
            title: "Implementación",
            description: "Convertimos las decisiones en una experiencia funcional.",
            ctaLabel: "Ver servicio",
            ctaUrl: "#contacto",
          },
          {
            id: "magic-service-3",
            title: "Acompañamiento",
            description: "Medimos, aprendemos y mejoramos de forma continua.",
            ctaLabel: "Hablemos",
            ctaUrl: "#contacto",
          },
        ],
      }),
      block("magic-image", "image", "card", {
        title: "Una imagen que explica tu trabajo",
        imageUrl: MAGIC_HERO_IMAGE,
        alt: "Espacio de trabajo profesional",
      }),
      block("magic-social", "social", "icons", {
        socials: [
          { id: "magic-social-instagram", platform: "instagram", url: "https://instagram.com" },
          { id: "magic-social-linkedin", platform: "linkedin", url: "https://linkedin.com" },
        ],
      }),
    ],
  };
}
