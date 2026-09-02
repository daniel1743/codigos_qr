/**
 * V1.5 — INDUSTRY COVERAGE FIXTURES.
 *
 * Deterministic sample inputs across real-world business archetypes,
 * each paired with an optional EngineContextV1. They exist to prove
 * coverage and stability — they are NOT a production template catalog and
 * must never be shipped as final designs.
 *
 * The original 10 SAMPLE_INTENTS remain untouched in ./intents.
 */

import type { EngineContextV1 } from "../context";
import type { OnboardingIntentV1 } from "../types";

const AT = "2026-01-01T00:00:00.000Z";

export interface IndustryFixture {
  id: string;
  intent: OnboardingIntentV1;
  context: EngineContextV1;
}

function make(
  id: string,
  business_type: string,
  business_other: string | null,
  primary_goal: OnboardingIntentV1["primary_goal"],
  visual_personality: OnboardingIntentV1["visual_personality"],
  identity: { name: string; profession: string; bio: string; avatar?: string; banner?: string },
  primary_action: OnboardingIntentV1["primary_action"],
  context: EngineContextV1,
  cardMedia = false,
): IndustryFixture {
  return {
    id,
    intent: {
      business_type,
      business_other,
      ...(cardMedia ? { assets: { card_media: true } } : {}),
      primary_goal,
      visual_personality,
      identity: {
        name: identity.name,
        profession: identity.profession,
        bio: identity.bio,
        avatar_preview: identity.avatar ?? null,
        banner_preview: identity.banner ?? null,
      },
      primary_action,
      meta: { version: "1", completed_at: AT },
    },
    context,
  };
}

const AVATAR = "https://cdn.example.com/avatar.jpg";
const BANNER = "https://cdn.example.com/banner.jpg";

export const INDUSTRY_FIXTURES: IndustryFixture[] = [
  make(
    "plumber-home-service",
    "local",
    null,
    "whatsapp",
    "professional",
    { name: "Fontanería Rivas", profession: "Fontanero urgencias 24h", bio: "Reparaciones rápidas en toda la ciudad.", avatar: AVATAR },
    { type: "whatsapp", value: "+34600111222" },
    {
      business: { archetype: "home_service", urgency: "high", locality: "service_area" },
      content: { services: { available: true, count: 6 }, service_areas: { available: true, count: 12 }, trust_facts: { available: true, count: 3 } },
      goals: { secondary: "leads" },
    },
  ),
  make(
    "hair-salon-appointment",
    "belleza",
    null,
    "booking",
    "elegant",
    { name: "Estudio Nara", profession: "Peluquería y color", bio: "Color, corte y tratamiento capilar.", avatar: AVATAR, banner: BANNER },
    { type: "booking", value: "https://calendly.com/nara" },
    {
      business: { archetype: "appointment_service", locality: "local" },
      content: { services: { available: true, count: 8 }, gallery: { available: true, count: 12 }, hours: { available: true }, booking: { available: true } },
    },
    true,
  ),
  make(
    "lawyer-professional",
    "profesional",
    null,
    "leads",
    "professional",
    { name: "Marín & Asociados", profession: "Abogados mercantiles", bio: "Asesoría legal para empresas.", avatar: AVATAR },
    { type: "email", value: "contacto@marinlegal.com" },
    {
      business: { archetype: "professional_service", trust_requirement: "high" },
      content: { services: { available: true, count: 5 }, trust_facts: { available: true, count: 4 }, testimonials: { available: true, count: 6 }, faq: { available: true, count: 8 } },
    },
  ),
  make(
    "carpenter-craft",
    "local",
    null,
    "portfolio",
    "minimal",
    { name: "Taller Sierra", profession: "Carpintería a medida", bio: "Muebles de madera maciza.", avatar: AVATAR, banner: BANNER },
    { type: "instagram", value: "@tallersierra" },
    {
      business: { archetype: "custom_craft", locality: "local" },
      content: { portfolio: { available: true, count: 20 }, before_after: { available: true, count: 6 }, gallery: { available: true, count: 24 } },
    },
    true,
  ),
  make(
    "photographer-portfolio",
    "creador",
    null,
    "portfolio",
    "modern",
    { name: "Lucía Vega", profession: "Fotógrafa de bodas", bio: "Historias reales, luz natural.", avatar: AVATAR, banner: BANNER },
    { type: "website", value: "https://luciavega.com" },
    {
      business: { archetype: "portfolio_service" },
      content: { portfolio: { available: true, count: 30 }, gallery: { available: true, count: 40 }, testimonials: { available: true, count: 10 } },
    },
    true,
  ),
  make(
    "boutique-hotel-hospitality",
    "otro",
    "Hotel boutique",
    "booking",
    "premium",
    { name: "Casa Oliva", profession: "Hotel boutique", bio: "Ocho habitaciones frente al mar.", avatar: AVATAR, banner: BANNER },
    { type: "booking", value: "https://booking.example.com/casaoliva" },
    {
      business: { archetype: "hospitality", locality: "local", price_model: "starting_at" },
      content: { gallery: { available: true, count: 30 }, booking: { available: true }, locations: { available: true, count: 1 }, pricing: { available: true, count: 1 } },
    },
    true,
  ),
  make(
    "restaurant-food",
    "restaurante",
    null,
    "whatsapp",
    "energetic",
    { name: "La Brasa", profession: "Restaurante de brasa", bio: "Cocina de fuego y producto local.", avatar: AVATAR, banner: BANNER },
    { type: "whatsapp", value: "+34600333444" },
    {
      business: { archetype: "food_service", urgency: "high", locality: "local" },
      content: { hours: { available: true }, locations: { available: true, count: 2 }, gallery: { available: true, count: 15 }, pricing: { available: true, count: 1 } },
    },
    true,
  ),
  make(
    "retail-shop",
    "otro",
    "Tienda de ropa",
    "sell",
    "modern",
    { name: "Nube Store", profession: "Moda sostenible", bio: "Prendas hechas en talleres locales.", avatar: AVATAR },
    { type: "website", value: "https://nubestore.example.com" },
    {
      business: { archetype: "retail", price_model: "fixed" },
      content: { products: { available: true, count: 40 }, pricing: { available: true, count: 1 }, gallery: { available: true, count: 10 } },
    },
    true,
  ),
  make(
    "creator-social",
    "creador",
    null,
    "social",
    "energetic",
    { name: "Dani Prats", profession: "Creador de contenido", bio: "Vídeo, humor y cultura pop.", avatar: AVATAR },
    { type: "instagram", value: "@daniprats" },
    {
      business: { archetype: "creator" },
      content: { links: { available: true, count: 7 }, video: { available: true } },
      goals: { secondary: "portfolio" },
    },
  ),
  make(
    "psychologist-wellness",
    "otro",
    "Psicología clínica",
    "booking",
    "minimal",
    { name: "Ana Cortés", profession: "Psicóloga clínica", bio: "Terapia individual, presencial y online.", avatar: AVATAR },
    { type: "booking", value: "https://cal.com/anacortes" },
    {
      business: { archetype: "wellness", trust_requirement: "high" },
      content: { services: { available: true, count: 4 }, faq: { available: true, count: 10 }, booking: { available: true }, trust_facts: { available: true, count: 3 } },
    },
  ),
  make(
    "academy-education",
    "otro",
    "Academia de idiomas",
    "leads",
    "professional",
    { name: "Idiomas Norte", profession: "Academia de inglés", bio: "Preparación de exámenes oficiales.", avatar: AVATAR },
    { type: "email", value: "info@idiomasnorte.com" },
    {
      business: { archetype: "education", trust_requirement: "high" },
      content: { services: { available: true, count: 9 }, pricing: { available: true, count: 1 }, testimonials: { available: true, count: 12 }, faq: { available: true, count: 14 } },
    },
  ),
  make(
    "real-estate-agent",
    "profesional",
    null,
    "leads",
    "premium",
    { name: "Sofía Lara", profession: "Agente inmobiliaria", bio: "Compra y venta en la zona centro.", avatar: AVATAR, banner: BANNER },
    { type: "whatsapp", value: "+34600555666" },
    {
      business: { archetype: "real_estate", locality: "multi_location", trust_requirement: "high" },
      content: { portfolio: { available: true, count: 18 }, locations: { available: true, count: 3 }, trust_facts: { available: true, count: 5 }, lead_form: { available: true } },
    },
    true,
  ),
  make(
    "event-dj",
    "otro",
    "DJ para eventos",
    "booking",
    "energetic",
    { name: "DJ Kimo", profession: "DJ de bodas y eventos", bio: "Música sin pausas, ambiente garantizado.", avatar: AVATAR, banner: BANNER },
    { type: "whatsapp", value: "+34600777888" },
    {
      business: { archetype: "events", urgency: "high" },
      content: { gallery: { available: true, count: 20 }, video: { available: true }, testimonials: { available: true, count: 9 }, booking: { available: true } },
    },
    true,
  ),
  make(
    "gym-fitness-local",
    "fitness",
    null,
    "leads",
    "energetic",
    { name: "Box Atlas", profession: "Entrenamiento funcional", bio: "Clases en grupos reducidos.", avatar: AVATAR, banner: BANNER },
    { type: "whatsapp", value: "+34600999000" },
    {
      business: { archetype: "local_business", locality: "local" },
      content: { services: { available: true, count: 6 }, hours: { available: true }, pricing: { available: true, count: 1 }, testimonials: { available: true, count: 7 } },
    },
    true,
  ),
  make(
    "saas-consultant-digital",
    "freelancer",
    null,
    "leads",
    "modern",
    { name: "Iker Solá", profession: "Consultor de producto digital", bio: "Estrategia y discovery para SaaS.", avatar: AVATAR },
    { type: "website", value: "https://ikersola.dev" },
    {
      business: { archetype: "digital_service", trust_requirement: "high" },
      content: { services: { available: true, count: 3 }, testimonials: { available: true, count: 5 }, lead_form: { available: true }, links: { available: true, count: 4 } },
    },
  ),
  make(
    "generic-minimal",
    "otro",
    "Proyecto personal",
    "social",
    "minimal",
    { name: "Marta Ruiz", profession: "Proyecto personal", bio: "Un enlace para todo." },
    { type: "instagram", value: "@martaruiz" },
    {},
  ),
];

export const INDUSTRY_FIXTURE_BY_ID = Object.fromEntries(
  INDUSTRY_FIXTURES.map((f) => [f.id, f]),
) as Record<string, IndustryFixture>;
