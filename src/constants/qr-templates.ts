/**
 * QR Template Bank - Free & Premium Designs
 *
 * Este catálogo define plantillas visuales aplicables al QR estable del usuario.
 * Las plantillas NO crean un QR nuevo, solo modifican la apariencia visual.
 */

export type QRTemplateTier = "free" | "premium";

export type QRTemplateCategory =
  | "minimal"
  | "business"
  | "creative"
  | "elegant"
  | "restaurant"
  | "event"
  | "beauty"
  | "music"
  | "creator"
  | "retail";

export interface QRTemplate {
  id: string;
  name: string;
  description: string;
  tier: QRTemplateTier;
  category: QRTemplateCategory;

  // Visual properties (solo las soportadas actualmente por el renderer)
  qr_foreground_color: string;
  qr_background_color: string;
  qr_logo_enabled: boolean;

  // Metadata
  preview_note?: string; // Nota opcional sobre el diseño
}

/**
 * PLANTILLAS GRATUITAS
 * - Contraste verificado
 * - Foreground oscuro, background claro
 * - Escaneo garantizado
 */
const FREE_TEMPLATES: QRTemplate[] = [
  {
    id: "classic",
    name: "Clásico",
    description: "Negro sobre blanco, el estándar universal.",
    tier: "free",
    category: "minimal",
    qr_foreground_color: "#000000",
    qr_background_color: "#FFFFFF",
    qr_logo_enabled: false,
  },
  {
    id: "minimal-dark",
    name: "Minimal",
    description: "Gris muy oscuro, moderno y profesional.",
    tier: "free",
    category: "minimal",
    qr_foreground_color: "#111827",
    qr_background_color: "#FFFFFF",
    qr_logo_enabled: false,
  },
  {
    id: "business-blue",
    name: "Business",
    description: "Azul corporativo confiable.",
    tier: "free",
    category: "business",
    qr_foreground_color: "#1E3A8A",
    qr_background_color: "#FFFFFF",
    qr_logo_enabled: false,
  },
  {
    id: "forest",
    name: "Natural",
    description: "Verde bosque, cálido y orgánico.",
    tier: "free",
    category: "business",
    qr_foreground_color: "#14532D",
    qr_background_color: "#FFFFFF",
    qr_logo_enabled: false,
  },
  {
    id: "elegant-gray",
    name: "Elegante",
    description: "Gris neutro sofisticado.",
    tier: "free",
    category: "elegant",
    qr_foreground_color: "#1F2937",
    qr_background_color: "#F9FAFB",
    qr_logo_enabled: false,
  },
  {
    id: "warm-brown",
    name: "Cálido",
    description: "Marrón tierra, acogedor.",
    tier: "free",
    category: "elegant",
    qr_foreground_color: "#451A03",
    qr_background_color: "#FEF3C7",
    qr_logo_enabled: false,
  },
];

/**
 * PLANTILLAS PREMIUM
 * - Diseños avanzados
 * - Colores de marca
 * - Logo habilitado en algunos casos
 */
const PREMIUM_TEMPLATES: QRTemplate[] = [
  {
    id: "executive",
    name: "Executive",
    description: "Alto contraste profesional, ideal para tarjetas de presentación.",
    tier: "premium",
    category: "business",
    qr_foreground_color: "#0F172A",
    qr_background_color: "#F8FAFC",
    qr_logo_enabled: true,
  },
  {
    id: "luxury",
    name: "Luxury",
    description: "Dorado sutil sobre crema, elegancia premium.",
    tier: "premium",
    category: "elegant",
    qr_foreground_color: "#78350F",
    qr_background_color: "#FFFBEB",
    qr_logo_enabled: true,
  },
  {
    id: "beauty",
    name: "Beauty",
    description: "Rosa suave y moderno para belleza y wellness.",
    tier: "premium",
    category: "beauty",
    qr_foreground_color: "#9F1239",
    qr_background_color: "#FFF1F2",
    qr_logo_enabled: true,
  },
  {
    id: "creator",
    name: "Creator",
    description: "Violeta vibrante para creadores de contenido.",
    tier: "premium",
    category: "creator",
    qr_foreground_color: "#581C87",
    qr_background_color: "#FAF5FF",
    qr_logo_enabled: true,
  },
  {
    id: "restaurant",
    name: "Restaurant",
    description: "Terracota cálido perfecto para menús y reservas.",
    tier: "premium",
    category: "restaurant",
    qr_foreground_color: "#7C2D12",
    qr_background_color: "#FFF7ED",
    qr_logo_enabled: false,
  },
  {
    id: "event",
    name: "Event",
    description: "Azul eléctrico moderno para eventos y entradas.",
    tier: "premium",
    category: "event",
    qr_foreground_color: "#1E3A8A",
    qr_background_color: "#EFF6FF",
    qr_logo_enabled: false,
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Turquesa profundo, fresco y digital.",
    tier: "premium",
    category: "creative",
    qr_foreground_color: "#0E7490",
    qr_background_color: "#ECFEFF",
    qr_logo_enabled: false,
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Índigo oscuro sobre fondo claro, misterioso.",
    tier: "premium",
    category: "creative",
    qr_foreground_color: "#312E81",
    qr_background_color: "#EEF2FF",
    qr_logo_enabled: true,
  },
  {
    id: "modern-tech",
    name: "Modern Tech",
    description: "Gris pizarra para tecnología y servicios.",
    tier: "premium",
    category: "business",
    qr_foreground_color: "#0F172A",
    qr_background_color: "#F1F5F9",
    qr_logo_enabled: true,
  },
  {
    id: "boutique",
    name: "Boutique",
    description: "Marrón chocolate premium para marcas exclusivas.",
    tier: "premium",
    category: "retail",
    qr_foreground_color: "#431407",
    qr_background_color: "#FEF3C7",
    qr_logo_enabled: true,
  },
  {
    id: "neon-safe",
    name: "Neon",
    description: "Verde neón seguro, perfecto para música y entretenimiento.",
    tier: "premium",
    category: "music",
    qr_foreground_color: "#065F46",
    qr_background_color: "#D1FAE5",
    qr_logo_enabled: false,
    preview_note: "Contraste optimizado para escaneo nocturno",
  },
  {
    id: "gold-edition",
    name: "Gold Edition",
    description: "Dorado oscuro exclusivo sobre beige.",
    tier: "premium",
    category: "elegant",
    qr_foreground_color: "#854D0E",
    qr_background_color: "#FFFBEB",
    qr_logo_enabled: true,
  },
];

/**
 * Catálogo completo de plantillas
 */
export const QR_TEMPLATES: QRTemplate[] = [...FREE_TEMPLATES, ...PREMIUM_TEMPLATES];

/**
 * Utilidades para filtrado
 */
export const getTemplatesByTier = (tier: QRTemplateTier): QRTemplate[] => {
  return QR_TEMPLATES.filter((t) => t.tier === tier);
};

export const getTemplatesByCategory = (category: QRTemplateCategory): QRTemplate[] => {
  return QR_TEMPLATES.filter((t) => t.category === category);
};

export const getTemplateById = (id: string): QRTemplate | undefined => {
  return QR_TEMPLATES.find((t) => t.id === id);
};

/**
 * Categorías disponibles para filtrado
 */
export const QR_CATEGORIES: Array<{ id: QRTemplateCategory | "all"; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "minimal", label: "Minimal" },
  { id: "business", label: "Negocios" },
  { id: "creative", label: "Creativos" },
  { id: "elegant", label: "Elegantes" },
  { id: "restaurant", label: "Restaurantes" },
  { id: "event", label: "Eventos" },
  { id: "beauty", label: "Belleza" },
  { id: "music", label: "Música" },
  { id: "creator", label: "Creadores" },
  { id: "retail", label: "Retail" },
];
