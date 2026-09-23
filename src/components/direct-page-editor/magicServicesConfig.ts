import type { PageDocumentV1 } from "../../lib/direct-page-editor/page-document";

const MAGIC_HERO_IMAGE =
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80";

export function createMagicServicesDocument(title: string): PageDocumentV1 {
  const visible = { desktop: true, tablet: true, mobile: true };
  return {
    documentType: "direct-page",
    version: 1,
    theme: {
      pageBackground: "#f7f4ef",
      surface: "#ffffff",
      primaryText: "#1f2937",
      secondaryText: "#6b7280",
      accent: "#0f766e",
      border: "#e5e7eb",
      fontFamily: "Inter",
      typographyScale: { heading: 48, body: 16 },
      radius: 28,
      buttonStyle: { preset: "tall-rounded" },
      spacingScale: { block: 28, section: 48 },
      contentWidth: 1040,
    },
    blocks: [
      {
        id: "magic-hero",
        type: "hero",
        variant: "image",
        visible: true,
        visibility: visible,
        layout: { spacing: "relaxed", width: "wide", alignment: "left" },
        content: {
          eyebrow: "SERVICIOS",
          title,
          subtitle: "Soluciones con intención y resultados medibles.",
          description: "Edita este texto directamente sobre la página y publica cuando esté listo.",
          image: MAGIC_HERO_IMAGE,
          primaryCTA: { label: "Hablemos", url: "mailto:hola@ejemplo.com" },
        },
        style: { radius: 32 },
      },
      {
        id: "magic-intro",
        type: "text",
        variant: "default",
        visible: true,
        visibility: visible,
        layout: { spacing: "normal", width: "content", alignment: "center" },
        content: {
          title: "Una experiencia directa",
          body: "Tu página permanece visible mientras ajustas el contenido, el estilo y la estructura.",
        },
        style: {},
      },
      {
        id: "magic-links",
        type: "links",
        variant: "cards",
        visible: true,
        visibility: visible,
        layout: { spacing: "normal", width: "content", alignment: "center" },
        content: {
          title: "Enlaces rápidos",
          items: [
            {
              id: "magic-link-contact",
              title: "Agendar una conversación",
              cta: { label: "Abrir", url: "#contacto" },
            },
            {
              id: "magic-link-work",
              title: "Ver proyectos",
              cta: { label: "Abrir", url: "#servicios" },
            },
          ],
        },
        style: {},
      },
      {
        id: "magic-services",
        type: "collection",
        variant: "services",
        visible: true,
        visibility: visible,
        layout: { spacing: "normal", width: "content", alignment: "left" },
        content: {
          title: "Servicios",
          description: "Presenta aquí tus servicios principales.",
          items: [
            {
              id: "magic-service-1",
              title: "Estrategia",
              description: "Ordenamos prioridades y definimos el siguiente paso.",
              cta: { label: "Consultar", url: "#contacto" },
            },
            {
              id: "magic-service-2",
              title: "Implementación",
              description: "Convertimos las decisiones en una experiencia funcional.",
              cta: { label: "Ver servicio", url: "#contacto" },
            },
            {
              id: "magic-service-3",
              title: "Acompañamiento",
              description: "Medimos, aprendemos y mejoramos de forma continua.",
              cta: { label: "Hablemos", url: "#contacto" },
            },
          ],
        },
        style: {},
      },
      {
        id: "magic-image",
        type: "image",
        variant: "card",
        visible: true,
        visibility: visible,
        layout: { spacing: "normal", width: "wide", alignment: "center" },
        content: {
          title: "Una imagen que explica tu trabajo",
          image: MAGIC_HERO_IMAGE,
          alt: "Espacio de trabajo profesional",
        },
        style: {},
      },
      {
        id: "magic-social",
        type: "social",
        variant: "icons",
        visible: true,
        visibility: visible,
        layout: { spacing: "normal", width: "content", alignment: "center" },
        content: {
          items: [
            {
              id: "magic-social-instagram",
              title: "Instagram",
              cta: { label: "Instagram", url: "https://instagram.com" },
            },
            {
              id: "magic-social-linkedin",
              title: "LinkedIn",
              cta: { label: "LinkedIn", url: "https://linkedin.com" },
            },
          ],
        },
        style: {},
      },
    ],
    footer: { visible: true, content: { branding: "Cripqer" } },
  };
}
