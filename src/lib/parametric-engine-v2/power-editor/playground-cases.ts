/**
 * PLAYGROUND CASES — the six mandatory visual scenarios.
 *
 * Demo data only. These are laboratory fixtures, never a production catalog.
 */

import type { OnboardingIntentV1 } from "../types";
import type { ContentSourceV2 } from "./content-source";
import type { MediaStrategyV2 } from "./media-strategy-v2";

const AT = "2026-01-01T00:00:00.000Z";
const IMG = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;
const AVATAR = IMG("photo-1544005313-94ddf0286df2");
const BANNER = IMG("photo-1497215728101-856f4ea42174");

export interface PlaygroundCase {
  id: string;
  title: string;
  goalDescription: string;
  intent: OnboardingIntentV1;
  content: ContentSourceV2;
  /** Optional existing strategy override for deterministic visual QA. */
  mediaStrategy?: MediaStrategyV2;
}

function intent(
  business_type: string,
  primary_goal: OnboardingIntentV1["primary_goal"],
  visual_personality: OnboardingIntentV1["visual_personality"],
  identity: { name: string; profession: string; bio: string; banner?: boolean },
  primary_action: OnboardingIntentV1["primary_action"],
): OnboardingIntentV1 {
  return {
    business_type,
    business_other: business_type === "other" ? "Escritura y ensayo" : null,
    primary_goal,
    visual_personality,
    identity: {
      name: identity.name,
      profession: identity.profession,
      bio: identity.bio,
      avatar_preview: AVATAR,
      banner_preview: identity.banner ? BANNER : null,
    },
    assets: { card_media: true },
    primary_action,
    meta: { version: "1", completed_at: AT },
  };
}

const SOCIALS = [
  { platform: "instagram", url: "https://instagram.com/cripqer" },
  { platform: "linkedin", url: "https://linkedin.com/in/cripqer" },
];

export const PLAYGROUND_CASES: PlaygroundCase[] = [
  {
    id: "luxury-professional",
    title: "Luxury professional",
    goalDescription: "Prestigio y captación de clientes de alto valor.",
    intent: intent(
      "professional",
      "booking",
      "premium",
      {
        name: "Elena Marchetti",
        profession: "Asesora patrimonial",
        bio: "Estrategia patrimonial discreta para familias y fundaciones.",
        banner: true,
      },
      { type: "booking", value: "https://cal.com/elena" },
    ),
    content: {
      about: "Veinte años acompañando decisiones financieras que trascienden generaciones.",
      badges: [{ label: "Colegiada" }, { label: "Responde en 24h" }],
      links: [
        { label: "Servicios", url: "https://example.com/servicios" },
        { label: "Notas de mercado", url: "https://example.com/notas" },
      ],
      contact: { email: "elena@example.com", address: "Madrid, España" },
      socials: SOCIALS,
      stats: [
        { value: "20", label: "Años de práctica" },
        { value: "180+", label: "Familias asesoradas" },
        { value: "4.9", label: "Satisfacción" },
      ],
      services: [
        { title: "Planificación patrimonial", description: "Estructura y sucesión.", price: "Desde 1.200 €" },
        { title: "Asesoría fiscal", description: "Optimización legal y reporting.", price: "Desde 600 €" },
      ],
      testimonials: [
        { name: "Familia Rovira", quote: "Rigor absoluto y una discreción impecable.", role: "Cliente privado", rating: 5 },
      ],
      pricing: [
        { title: "Consulta", price: "250 €", period: "sesión", features: ["60 minutos", "Informe posterior"] },
        { title: "Acompañamiento", price: "1.200 €", period: "mes", features: ["Revisión trimestral", "Contacto directo"], recommended: true },
      ],
      faq: [
        { question: "¿Trabajas con patrimonios internacionales?", answer: "Sí, con equipos locales en cada jurisdicción." },
      ],
      timeline: [
        { date: "2018 - hoy", title: "Práctica independiente" },
        { date: "2006 - 2018", title: "Banca privada" },
      ],
      quickActions: [{ label: "WhatsApp", url: "https://wa.me/34600000000", icon: "whatsapp" }],
      bookingUrl: "https://cal.com/elena",
    },
  },
  {
    id: "creator-media",
    title: "Creator media",
    goalDescription: "Audiencia, contenido y crecimiento social.",
    intent: intent(
      "creator",
      "social",
      "energetic",
      {
        name: "Nico Vidal",
        profession: "Creador audiovisual",
        bio: "Vídeo vertical, marca personal y campañas que se comparten solas.",
        banner: true,
      },
      { type: "instagram", value: "https://instagram.com/nicovidal" },
    ),
    content: {
      links: [
        { label: "Últimos vídeos", url: "https://example.com/videos" },
        { label: "Colaboraciones", url: "https://example.com/brands" },
      ],
      video: { provider: "youtube", videoId: "ScMzIvxBSi4", title: "Showreel 2026" },
      gallery: [
        { url: IMG("photo-1503602642458-232111445657") },
        { url: IMG("photo-1517840901100-8179e982acb7") },
        { url: IMG("photo-1526779259212-939e64788e3c") },
      ],
      socials: SOCIALS,
      qrUrl: "https://cripqer.com/nicovidal",
    },
  },
  {
    id: "local-business",
    title: "Local business",
    goalDescription: "Contacto inmediato por WhatsApp y visitas al local.",
    intent: intent(
      "food",
      "whatsapp",
      "modern",
      {
        name: "Panadería Aurora",
        profession: "Obrador artesano",
        bio: "Masa madre, horno de piedra y pedidos el mismo día.",
      },
      { type: "whatsapp", value: "+34600111222" },
    ),
    content: {
      badges: [{ label: "Abierto hoy" }, { label: "Pedidos en 2h" }],
      links: [
        { label: "Carta del día", url: "https://example.com/carta" },
        { label: "Cómo llegar", url: "https://example.com/mapa" },
      ],
      contact: { phone: "+34 600 000 000", address: "Calle Mayor 4, Valencia" },
      mediaCard: {
        title: "El obrador",
        body: "Cada hogaza fermenta 18 horas.",
        imageUrl: IMG("photo-1509440159596-0249088772ff"),
      },
    },
  },
  {
    id: "portfolio-visual",
    title: "Portfolio visual",
    goalDescription: "Mostrar trabajo y conseguir encargos.",
    intent: intent(
      "freelancer",
      "portfolio",
      "minimal",
      {
        name: "Sara Ibáñez",
        profession: "Diseñadora de producto",
        bio: "Interfaces claras para productos complejos.",
        banner: true,
      },
      { type: "website", value: "https://sara.design" },
    ),
    content: {
      portfolio: [
        {
          label: "Nova Rebrand",
          description: "Identidad",
          url: "https://example.com/nova",
          imageUrl: IMG("photo-1558655146-d09347e92766"),
        },
        {
          label: "Atlas App",
          description: "Producto",
          url: "https://example.com/atlas",
          imageUrl: IMG("photo-1541701494587-cb58502866ab"),
        },
      ],
      document: { title: "Portfolio 2026", fileName: "portfolio.pdf", fileSize: "3.1 MB", url: "https://example.com/portfolio.pdf" },
      socials: SOCIALS,
    },
  },
  {
    id: "corporate-trust",
    title: "Corporate trust",
    goalDescription: "Credibilidad y generación de leads cualificados.",
    intent: intent(
      "professional",
      "leads",
      "professional",
      {
        name: "Grupo Verande",
        profession: "Consultoría industrial",
        bio: "Optimización de operaciones para plantas de fabricación.",
      },
      { type: "email", value: "contacto@verande.com" },
    ),
    content: {
      badges: [{ label: "ISO 9001" }, { label: "+120 proyectos" }],
      about: "Equipos senior que trabajan dentro de tu planta, no desde una presentación.",
      links: [
        { label: "Casos de éxito", url: "https://example.com/casos" },
        { label: "Metodología", url: "https://example.com/metodo" },
      ],
      contact: { email: "contacto@verande.com", phone: "+34 910 000 000" },
      document: { title: "Dossier corporativo", fileName: "dossier.pdf", fileSize: "1.8 MB", url: "https://example.com/dossier.pdf" },
    },
  },
  {
    id: "editorial-personal",
    title: "Editorial personal",
    goalDescription: "Voz propia, lectura pausada y suscripción.",
    intent: intent(
      "other",
      "portfolio",
      "elegant",
      {
        name: "Martín Oreja",
        profession: "Escritor y ensayista",
        bio: "Ensayo sobre ciudades, memoria y arquitectura cotidiana.",
      },
      { type: "website", value: "https://martinoreja.com" },
    ),
    content: {
      about: "Publico una carta larga cada mes. Sin ruido, sin urgencia.",
      links: [
        { label: "Leer el último ensayo", url: "https://example.com/ensayo" },
        { label: "Suscribirse", url: "https://example.com/suscripcion" },
      ],
      featured: {
        title: "Ciudades prestadas",
        subtitle: "Ensayo · 2026",
        url: "https://example.com/libro",
        imageUrl: IMG("photo-1517245386807-bb43f82c33c4"),
      },
      socials: SOCIALS,
    },
  },
];
