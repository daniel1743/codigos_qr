import { BASIC_CARD_CTA_PRESETS } from "@/types/basic-templates";
import type { BasicTemplateContent } from "@/types/basic-templates";
import { getTemplate } from "./catalog";
import { gradientImage, portraitImage } from "./placeholder";

/**
 * Realistic (clearly fictional) demo content so templates look finished
 * before the user edits anything.
 */

function beautyContent(): BasicTemplateContent {
  return {
    profile: {
      avatarUrl: portraitImage({ from: "#E8B4A2", to: "#C98A7D", initials: "SR" }),
      name: "Sofía Ramírez",
      subtitle: "Maquilladora & Estilista",
      bio: "Realzo tu belleza natural con maquillaje profesional para eventos, editoriales y tu día a día.",
      heroUrl: gradientImage({ from: "#F3C6B8", to: "#C98A7D", label: "Beauty" }),
    },
    links: [
      { id: "beauty-link-1", label: "Reservar cita", url: "https://example.com/reservar", enabled: true },
      { id: "beauty-link-2", label: "Ver portafolio", url: "https://example.com/portafolio", enabled: true },
      { id: "beauty-link-3", label: "Tienda de productos", url: "https://example.com/tienda", enabled: true },
    ],
    cards: [
      {
        id: "beauty-card-1",
        imageUrl: gradientImage({ from: "#E9C6C0", to: "#C98A7D", label: "Novias", decoration: "product", width: 600, height: 400 }),
        title: "Maquillaje de novia",
        description: "Look duradero y natural para tu gran día, con prueba previa incluida.",
        ctaLabel: BASIC_CARD_CTA_PRESETS[3],
        ctaUrl: "https://example.com/novias",
        enabled: true,
      },
      {
        id: "beauty-card-2",
        imageUrl: gradientImage({ from: "#EAD4C8", to: "#B98A70", label: "Editorial", decoration: "product", width: 600, height: 400 }),
        title: "Editorial & moda",
        description: "Maquillaje de alto impacto para sesiones fotográficas y pasarelas.",
        ctaLabel: BASIC_CARD_CTA_PRESETS[1],
        ctaUrl: "https://example.com/editorial",
        enabled: true,
      },
      {
        id: "beauty-card-3",
        imageUrl: gradientImage({ from: "#EFE0D2", to: "#C9A98A", label: "Social", decoration: "product", width: 600, height: 400 }),
        title: "Looks para redes",
        description: "Asesoría de imagen y looks para tus contenidos y marca personal.",
        ctaLabel: BASIC_CARD_CTA_PRESETS[2],
        ctaUrl: "https://example.com/asesoria",
        enabled: true,
      },
    ],
    socials: [
      { id: "beauty-social-1", platform: "instagram", url: "https://instagram.com/", enabled: true },
      { id: "beauty-social-2", platform: "tiktok", url: "https://tiktok.com/", enabled: true },
      { id: "beauty-social-3", platform: "whatsapp", url: "https://wa.me/", enabled: true },
    ],
    contact: {
      phone: "+56 9 1234 5678",
      email: "hola@sofiabeauty.cl",
      whatsapp: "+56 9 1234 5678",
    },
  };
}

function corporateContent(): BasicTemplateContent {
  return {
    profile: {
      avatarUrl: portraitImage({ from: "#33445F", to: "#0F2E4E", initials: "AV" }),
      name: "Alejandro Vidal",
      subtitle: "Director de Operaciones",
      bio: "Más de 15 años liderando equipos y optimizando procesos para empresas en crecimiento.",
      heroUrl: gradientImage({ from: "#2E3D55", to: "#0F2E4E", label: "Corporate" }),
    },
    links: [
      { id: "corp-link-1", label: "LinkedIn", url: "https://linkedin.com/in/", enabled: true },
      { id: "corp-link-2", label: "Sitio web", url: "https://example.com", enabled: true },
      { id: "corp-link-3", label: "Agendar reunión", url: "https://example.com/agendar", enabled: true },
    ],
    cards: [],
    socials: [
      { id: "corp-social-1", platform: "linkedin", url: "https://linkedin.com/in/", enabled: true },
      { id: "corp-social-2", platform: "website", url: "https://example.com", enabled: true },
    ],
    contact: {
      phone: "+56 2 2987 6543",
      email: "alejandro.vidal@empresa.cl",
      whatsapp: "+56 9 8765 4321",
    },
  };
}

export function getDefaultContent(templateId: string): BasicTemplateContent {
  const template = getTemplate(templateId);
  if (template.family === "professional_corporate") return corporateContent();
  return beautyContent();
}
