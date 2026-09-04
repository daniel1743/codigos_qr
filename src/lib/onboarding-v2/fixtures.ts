import type { OnboardingIntentV1 } from "../onboarding/types";
import type { OnboardingIntentV2 } from "./types";

export const SIMPLE_CONTACT_FIXTURE: OnboardingIntentV2 = {
  version: "2",
  identity: {
    displayName: "Jardinería Verde",
    professionOrActivity: "Jardinero",
    bio: "Cuido jardines y espacios verdes.",
  },
  business: { category: "local" },
  outcome: { primaryGoal: "whatsapp", experienceHint: "personal_page" },
  visualDirection: { preference: "let_cripqer_decide" },
  contentNeeds: { items: [{ type: "links" }, { type: "social_networks" }] },
  actions: {
    primary: { type: "whatsapp", source: "user", value: "+56912345678" },
    secondary: [{ type: "follow", source: "user", value: "@jardineriaverde" }],
  },
  media: { preference: "minimal_media", hasOwnPhotos: false },
  scope: { density: "simple", userSelected: true },
  meta: {
    version: "2",
    completedAt: "2026-09-04T12:00:00.000Z",
    source: "onboarding_v2",
    locale: "es-CL",
  },
};

export const RICH_SERVICE_FIXTURE: OnboardingIntentV2 = {
  version: "2",
  identity: {
    displayName: "Clínica Vet Vida",
    professionOrActivity: "Veterinaria",
    bio: "Atención veterinaria cercana para cada etapa de tu mascota.",
  },
  business: { category: "professional" },
  outcome: { primaryGoal: "bookings", experienceHint: "service_page" },
  visualDirection: { preference: "professional" },
  contentNeeds: {
    items: [
      { type: "services" },
      { type: "team" },
      { type: "gallery" },
      { type: "testimonials" },
      { type: "booking" },
    ],
  },
  actions: {
    primary: { type: "book", source: "user", value: "https://agenda.vetvida.example/reservas" },
    secondary: [{ type: "whatsapp", source: "user", value: "+56987654321" }],
  },
  media: {
    preference: "own_media",
    hasOwnPhotos: true,
    hasPortfolioOrGalleryAssets: true,
    hasLogoOrAvatar: true,
  },
  scope: { density: "complete", userSelected: true },
  meta: {
    version: "2",
    completedAt: "2026-09-04T12:01:00.000Z",
    source: "onboarding_v2",
    locale: "es-CL",
  },
};

export const FUTURE_COMMERCE_FIXTURE: OnboardingIntentV2 = {
  version: "2",
  identity: { displayName: "Tienda Norte", professionOrActivity: "Tienda minorista" },
  business: { category: "retail" },
  outcome: { primaryGoal: "sell", experienceHint: "catalog" },
  visualDirection: { preference: "modern" },
  contentNeeds: { items: [{ type: "links" }, { type: "contact" }] },
  actions: {
    primary: { type: "buy", source: "user", value: "https://tiendanorte.example/catalogo" },
    secondary: [{ type: "whatsapp", source: "user", value: "+56922223333" }],
  },
  media: { preference: "find_media", needsMediaHelp: true },
  scope: { density: "auto", userSelected: false },
  commercial: { mode: "hybrid", relevant: true },
  meta: {
    version: "2",
    completedAt: "2026-09-04T12:02:00.000Z",
    source: "onboarding_v2",
    locale: "es-CL",
  },
};

export const NO_PRIMARY_CTA_FIXTURE: OnboardingIntentV2 = {
  version: "2",
  identity: { displayName: "Ana Torres", professionOrActivity: "Escritora" },
  business: { category: "creator" },
  outcome: { primaryGoal: "presence", experienceHint: "personal_page" },
  visualDirection: { preference: "elegant" },
  contentNeeds: { items: [{ type: "portfolio" }] },
  actions: { secondary: [] },
  media: { preference: "no_preference" },
  scope: { density: "auto", userSelected: false },
  meta: {
    version: "2",
    completedAt: "2026-09-04T12:03:00.000Z",
    source: "onboarding_v2",
    locale: "es-CL",
  },
};

export const MIGRATED_V1_SOURCE: OnboardingIntentV1 = {
  business_type: "profesional",
  business_other: null,
  primary_goal: "booking",
  visual_personality: "professional",
  identity: {
    name: "Consulta Aurora",
    profession: "Nutricionista",
    bio: "Orientación nutricional personalizada.",
    avatar_preview: null,
  },
  primary_action: { type: "booking", value: "https://consulta-aurora.example/agenda" },
  meta: { version: "1", completed_at: "2026-09-04T12:04:00.000Z" },
};
