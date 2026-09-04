/**
 * 10 deterministic SAMPLE INPUT FIXTURES.
 *
 * These exist to test engine coverage. They are NOT a production template
 * catalog and must never be treated as final designs.
 */

import type { OnboardingIntentV1 } from "../types";

const AT = "2026-01-01T00:00:00.000Z";

function intent(
  id: string,
  business_type: string,
  primary_goal: OnboardingIntentV1["primary_goal"],
  visual_personality: OnboardingIntentV1["visual_personality"],
  identity: { name: string; profession: string; bio: string; avatar?: string | null },
  primary_action: OnboardingIntentV1["primary_action"],
  business_other: string | null = null,
  assets?: OnboardingIntentV1["assets"],
): { id: string; intent: OnboardingIntentV1 } {
  return {
    id,
    intent: {
      business_type,
      business_other,
      ...(assets ? { assets } : {}),
      primary_goal,
      visual_personality,
      identity: {
        name: identity.name,
        profession: identity.profession,
        bio: identity.bio,
        avatar_preview: identity.avatar ?? null,
      },
      primary_action,
      meta: { version: "1", completed_at: AT },
    },
  };
}

export const SAMPLE_INTENTS: { id: string; intent: OnboardingIntentV1 }[] = [
  intent(
    "beauty-booking-elegant",
    "belleza",
    "booking",
    "elegant",
    { name: "Estudio Aurora", profession: "Salón de belleza", bio: "Color y cuidado capilar.", avatar: "https://cdn.example.com/a1.jpg" },
    { type: "booking", value: "https://calendly.com/aurora" },
  ),
  intent(
    "beauty-whatsapp-premium",
    "belleza",
    "whatsapp",
    "premium",
    { name: "Valentina Ruiz", profession: "Estética avanzada", bio: "Tratamientos personalizados." },
    { type: "whatsapp", value: "+56912345678" },
  ),
  intent(
    "professional-leads-professional",
    "profesional",
    "leads",
    "professional",
    { name: "Estudio Lex", profession: "Abogados corporativos", bio: "Asesoría legal para empresas." },
    { type: "email", value: "contacto@estudiolex.cl" },
  ),
  intent(
    "professional-portfolio-minimal",
    "profesional",
    "portfolio",
    "minimal",
    { name: "Dra. Paula Soto", profession: "Psicóloga clínica", bio: "Terapia breve y acompañamiento." },
    { type: "website", value: "https://paulasoto.cl" },
  ),
  intent(
    "creator-social-energetic",
    "creador",
    "social",
    "energetic",
    { name: "Nico Vera", profession: "Creador de contenido", bio: "Video y comunidad.", avatar: "https://cdn.example.com/a2.jpg" },
    { type: "instagram", value: "@nicovera" },
  ),
  intent(
    "creator-portfolio-modern",
    "creador",
    "portfolio",
    "modern",
    { name: "Camila Ossa", profession: "Fotógrafa", bio: "Retrato y editorial.", avatar: "https://cdn.example.com/a3.jpg" },
    { type: "website", value: "https://camilaossa.com" },
    null,
    { card_media: true },
  ),
  intent(
    "food-booking-premium",
    "restaurante",
    "booking",
    "premium",
    { name: "Casa Duna", profession: "Restaurante costero", bio: "Cocina de producto.", avatar: "https://cdn.example.com/a4.jpg" },
    { type: "booking", value: "https://reservas.casaduna.cl" },
  ),
  intent(
    "fitness-leads-energetic",
    "fitness",
    "leads",
    "energetic",
    { name: "Box Norte", profession: "Entrenamiento funcional", bio: "Clases grupales y personalizadas." },
    { type: "whatsapp", value: "+56987654321" },
  ),
  intent(
    "freelancer-portfolio-minimal",
    "freelancer",
    "portfolio",
    "minimal",
    { name: "Tomás Rivas", profession: "Diseñador de producto", bio: "Interfaces y sistemas de diseño." },
    { type: "website", value: "https://tomasrivas.design" },
  ),
  intent(
    "local-whatsapp-professional",
    "local",
    "whatsapp",
    "professional",
    { name: "Ferretería El Roble", profession: "Ferretería de barrio", bio: "Todo para tu hogar." },
    { type: "whatsapp", value: "+56922334455" },
  ),
];

export const SAMPLE_INTENT_BY_ID = Object.fromEntries(
  SAMPLE_INTENTS.map((s) => [s.id, s.intent]),
) as Record<string, OnboardingIntentV1>;

/** Deliberately malformed intent used to test safe rejection. */
export const INVALID_INTENT = {
  business_type: "",
  business_other: null,
  primary_goal: "growth",
  visual_personality: "neon",
  identity: { name: "A", profession: "", bio: 12, avatar_preview: 3 },
  primary_action: { type: "telegram", value: "" },
  meta: { version: "2" },
} as unknown as OnboardingIntentV1;
