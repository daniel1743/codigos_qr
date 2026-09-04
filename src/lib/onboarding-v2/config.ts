import type {
  ActionTypeV2,
  BusinessCategoryV2,
  CommercialModeV2,
  ContentNeedV2,
  DensityV2,
  MediaPreferenceV2,
  PrimaryGoalV2,
  VisualDirectionV2,
} from "./types";

export interface OnboardingChoice<T extends string> {
  id: T;
  label: string;
  caption?: string;
}

export const BUSINESS_OPTIONS: OnboardingChoice<BusinessCategoryV2>[] = [
  { id: "beauty", label: "Belleza y bienestar" },
  { id: "professional", label: "Servicios profesionales" },
  { id: "creator", label: "Creador o artista" },
  { id: "food", label: "Comida y gastronomía" },
  { id: "fitness", label: "Fitness y deporte" },
  { id: "local", label: "Negocio local" },
  { id: "freelancer", label: "Freelance" },
  { id: "retail", label: "Tienda o productos" },
  { id: "other", label: "Otro", caption: "Escribe tu actividad en el siguiente campo." },
];

export const GOAL_OPTIONS: OnboardingChoice<PrimaryGoalV2>[] = [
  { id: "presence", label: "Tener presencia online" },
  { id: "contacts", label: "Recibir contactos" },
  { id: "whatsapp", label: "Recibir mensajes por WhatsApp" },
  { id: "bookings", label: "Recibir reservas o citas" },
  { id: "show_services", label: "Mostrar mis servicios" },
  { id: "show_portfolio", label: "Mostrar mi trabajo" },
  { id: "sell", label: "Vender o mostrar productos" },
  { id: "quote_requests", label: "Recibir solicitudes de presupuesto" },
  { id: "social_growth", label: "Hacer crecer mis redes" },
  { id: "other", label: "Otro", caption: "Cuéntanos qué quieres conseguir." },
];

export const VISUAL_OPTIONS: OnboardingChoice<VisualDirectionV2>[] = [
  {
    id: "let_cripqer_decide",
    label: "Que Cripqer decida",
    caption: "Crearemos una base coherente con tus respuestas.",
  },
  { id: "minimal", label: "Minimalista", caption: "Claro, simple y sin ruido." },
  { id: "modern", label: "Moderna", caption: "Actual y con energía visual." },
  { id: "professional", label: "Profesional", caption: "Confiable y enfocada." },
  { id: "elegant", label: "Elegante", caption: "Cuidada y sofisticada." },
  { id: "energetic", label: "Enérgica", caption: "Viva y expresiva." },
  { id: "premium", label: "Premium", caption: "Distintiva y refinada." },
  { id: "other", label: "Otra", caption: "Describe brevemente la sensación." },
];

export const CONTENT_OPTIONS: OnboardingChoice<ContentNeedV2>[] = [
  { id: "links", label: "Enlaces importantes" },
  { id: "services", label: "Servicios" },
  { id: "products", label: "Productos" },
  { id: "portfolio", label: "Portafolio" },
  { id: "gallery", label: "Galería de fotos" },
  { id: "video", label: "Videos" },
  { id: "team", label: "Equipo" },
  { id: "testimonials", label: "Testimonios" },
  { id: "booking", label: "Reservas o agenda" },
  { id: "contact", label: "Datos de contacto" },
  { id: "social_networks", label: "Redes sociales" },
  { id: "pricing", label: "Precios" },
  { id: "location", label: "Ubicación" },
  { id: "faq", label: "Preguntas frecuentes" },
  { id: "other", label: "Otra cosa" },
];

export const ACTION_OPTIONS: OnboardingChoice<ActionTypeV2>[] = [
  { id: "whatsapp", label: "WhatsApp", caption: "Número con código de país." },
  { id: "call", label: "Llamar", caption: "Número con código de país." },
  { id: "book", label: "Reservar", caption: "Puedes añadir el enlace ahora o después." },
  { id: "buy", label: "Comprar", caption: "Puedes añadir el enlace ahora o después." },
  {
    id: "request_quote",
    label: "Pedir presupuesto",
    caption: "Puedes añadir el enlace ahora o después.",
  },
  { id: "website", label: "Visitar sitio web" },
  { id: "menu", label: "Ver menú" },
  { id: "follow", label: "Seguir en redes", caption: "Usuario o enlace." },
  { id: "email", label: "Enviar email" },
  { id: "contact", label: "Contactar", caption: "Enlace de contacto." },
  { id: "other", label: "Otra acción" },
];

export const MEDIA_OPTIONS: OnboardingChoice<MediaPreferenceV2>[] = [
  { id: "own_media", label: "Tengo mis propias fotos o videos" },
  { id: "find_media", label: "Necesito ayuda para encontrar material" },
  { id: "minimal_media", label: "Prefiero algo con poco material" },
  { id: "no_preference", label: "Todavía no lo sé" },
];

export const DENSITY_OPTIONS: OnboardingChoice<DensityV2>[] = [
  { id: "simple", label: "Sencilla", caption: "Solo lo esencial para empezar." },
  { id: "complete", label: "Completa", caption: "Quiero mostrar más información." },
  {
    id: "auto",
    label: "Que Cripqer decida",
    caption: "Usaremos tus respuestas para proponer el alcance.",
  },
];

export const COMMERCIAL_OPTIONS: OnboardingChoice<CommercialModeV2>[] = [
  { id: "display_only", label: "Solo mostrar", caption: "Sin venta directa por ahora." },
  { id: "contact", label: "Recibir contactos" },
  { id: "booking", label: "Recibir reservas" },
  { id: "quote", label: "Recibir presupuestos" },
  { id: "sell", label: "Vender" },
  {
    id: "hybrid",
    label: "Mostrar y vender",
    caption: "Señal semántica; no configura un catálogo.",
  },
];

export const SEMANTIC_ACTIONS_WITH_OPTIONAL_DESTINATION: ActionTypeV2[] = [
  "book",
  "buy",
  "request_quote",
];

export const ONBOARDING_V2_STORAGE_KEY = "cripqer.onboarding.draft.v2";
