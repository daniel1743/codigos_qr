/**
 * Template Factory — Datasets de industria y pools de assets
 * PASS C · generator-v1
 *
 * Contenido de demostración: identidades ficticias, sin claims médicos ni
 * garantías legales, sin precios y sin datos de personas reales.
 *
 * Los assets son REFERENCIAS compartidas y reutilizables entre plantillas.
 * Nunca se guarda binario ni base64 dentro del TemplateConfig.
 */

import type { ActionTypeId, IconClass, SocialPlatformId, ThemeId } from "./registries";

export const INDUSTRY_IDS = ["medical", "legal", "restaurant", "barber"] as const;
export type IndustryId = (typeof INDUSTRY_IDS)[number];

/** Nombre de industria tal como se muestra en la biblioteca administrativa. */
export const INDUSTRY_UI_NAMES: Record<IndustryId, string> = {
  medical: "Salud",
  legal: "Legal",
  restaurant: "Restaurantes",
  barber: "Barberías",
};

/** Categoría que se persiste en el registro de la biblioteca privada. */
export const INDUSTRY_CATEGORIES: Record<IndustryId, string> = {
  medical: "Salud",
  legal: "Legal",
  restaurant: "Gastronomía",
  barber: "Servicios",
};

/**
 * Una acción candidata para un botón. `role` permite que el motor de conteo
 * elija 1..5 botones con propósitos distintos en lugar de duplicar el mismo.
 */
export type ActionRole = "primary" | "contact" | "info" | "location" | "social";

export interface ActionCandidate {
  role: ActionRole;
  text: string;
  actionType: ActionTypeId;
  icon: IconClass;
  /** Valor de destino en el formato que espera `resolveActionHref()`. */
  target: string;
}

/** Referencia a un asset compartido del pool. */
export interface AssetRef {
  id: string;
  url: string;
  kind: "avatar" | "banner";
}

export interface IdentitySample {
  logoText: string;
  subtitleText: string;
  titleText: string;
}

export interface IndustryDataset {
  id: IndustryId;
  uiName: string;
  category: string;
  identities: readonly IdentitySample[];
  footerTexts: readonly string[];
  actions: readonly ActionCandidate[];
  socialPlatforms: readonly SocialPlatformId[];
  avatars: readonly AssetRef[];
  banners: readonly AssetRef[];
  preferredThemes: readonly ThemeId[];
}

/**
 * Pool de avatares/banners compartido. Un mismo asset se reutiliza en varias
 * plantillas a propósito: el objetivo es no duplicar binarios por template.
 * Parámetros de Unsplash fijos para que la URL sea estable y cacheable.
 */
const UNSPLASH = (photoId: string, width: number) =>
  `https://images.unsplash.com/photo-${photoId}?q=80&w=${width}&auto=format&fit=crop`;

const AVATARS = {
  doctor01: { id: "doctor-01", kind: "avatar", url: UNSPLASH("1612349317150-e413f6a5b16d", 400) },
  doctor02: { id: "doctor-02", kind: "avatar", url: UNSPLASH("1622253692010-333f2da6031d", 400) },
  doctor03: { id: "doctor-03", kind: "avatar", url: UNSPLASH("1594824476967-48c8b964273f", 400) },
  lawyer01: { id: "lawyer-01", kind: "avatar", url: UNSPLASH("1573496359142-b8d87734a5a2", 400) },
  lawyer02: { id: "lawyer-02", kind: "avatar", url: UNSPLASH("1556157382-97eda2d62296", 400) },
  lawyer03: { id: "lawyer-03", kind: "avatar", url: UNSPLASH("1560250097-0b93528c311a", 400) },
  chef01: { id: "chef-01", kind: "avatar", url: UNSPLASH("1583394293214-28ded15ee548", 400) },
  chef02: { id: "chef-02", kind: "avatar", url: UNSPLASH("1577219491135-ce391730fb2c", 400) },
  barber01: { id: "barber-01", kind: "avatar", url: UNSPLASH("1621605815971-fbc98d665033", 400) },
  barber02: { id: "barber-02", kind: "avatar", url: UNSPLASH("1503951914875-452162b0f3f1", 400) },
  barber03: { id: "barber-03", kind: "avatar", url: UNSPLASH("1519345182560-3f2917c472ef", 400) },
} as const satisfies Record<string, AssetRef>;

const BANNERS = {
  clinic01: { id: "clinic-01", kind: "banner", url: UNSPLASH("1519494026892-80bbd2d6fd0d", 1280) },
  clinic02: { id: "clinic-02", kind: "banner", url: UNSPLASH("1631217868264-e5b90bb7e133", 1280) },
  office01: { id: "office-01", kind: "banner", url: UNSPLASH("1497366754035-f200968a6e72", 1280) },
  office02: { id: "office-02", kind: "banner", url: UNSPLASH("1521737604893-d14cc237f11d", 1280) },
  resto01: { id: "resto-01", kind: "banner", url: UNSPLASH("1517248135467-4c7edcad34c4", 1280) },
  resto02: { id: "resto-02", kind: "banner", url: UNSPLASH("1552566626-52f8b828add9", 1280) },
  barbershop01: { id: "barbershop-01", kind: "banner", url: UNSPLASH("1585747860715-2ba37e788b70", 1280) },
  barbershop02: { id: "barbershop-02", kind: "banner", url: UNSPLASH("1503951458645-643d53bfd90f", 1280) },
} as const satisfies Record<string, AssetRef>;

/** Índice plano del pool, para validar que un asset citado exista de verdad. */
export const ASSET_POOL: Record<string, AssetRef> = Object.fromEntries(
  [...Object.values(AVATARS), ...Object.values(BANNERS)].map((asset) => [asset.id, asset]),
);

const MEDICAL: IndustryDataset = {
  id: "medical",
  uiName: INDUSTRY_UI_NAMES.medical,
  category: INDUSTRY_CATEGORIES.medical,
  identities: [
    { logoText: "Clínica Aurora", subtitleText: "MEDICINA GENERAL", titleText: "DRA. ELENA VARGAS" },
    { logoText: "Centro Vitalis", subtitleText: "MEDICINA INTERNA", titleText: "DR. MARTÍN SOLÍS" },
    { logoText: "Salud Integral", subtitleText: "PEDIATRÍA", titleText: "DRA. CAMILA REYES" },
    { logoText: "Instituto Nexo", subtitleText: "NUTRICIÓN CLÍNICA", titleText: "DR. ANDRÉS PARRA" },
  ],
  footerTexts: [
    "Toca para agendar tu hora",
    "Reserva tu consulta en línea",
    "Estamos para atenderte",
  ],
  actions: [
    { role: "primary", text: "Reservar consulta", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/reservas" },
    { role: "contact", text: "WhatsApp", actionType: "whatsapp", icon: "fa-brands fa-whatsapp", target: "+56912345678" },
    { role: "contact", text: "Llamar", actionType: "phone", icon: "fa-solid fa-phone", target: "+56221234567" },
    { role: "info", text: "Especialidades", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/especialidades" },
    { role: "info", text: "Convenios", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/convenios" },
    { role: "location", text: "Ubicación", actionType: "location", icon: "fa-solid fa-location-dot", target: "https://maps.google.com/?q=clinica" },
    { role: "social", text: "Instagram", actionType: "url", icon: "fa-brands fa-instagram", target: "https://instagram.com/demo.clinica" },
  ],
  socialPlatforms: ["whatsapp", "instagram", "email", "website"],
  avatars: [AVATARS.doctor01, AVATARS.doctor02, AVATARS.doctor03],
  banners: [BANNERS.clinic01, BANNERS.clinic02],
  preferredThemes: ["premium-white", "executive-blue", "emerald-luxury"],
};

const LEGAL: IndustryDataset = {
  id: "legal",
  uiName: INDUSTRY_UI_NAMES.legal,
  category: INDUSTRY_CATEGORIES.legal,
  identities: [
    { logoText: "Vega & Asociados", subtitleText: "ABOGADA", titleText: "DRA. ISABEL VEGA" },
    { logoText: "Estudio Marín", subtitleText: "DERECHO CORPORATIVO", titleText: "DR. TOMÁS MARÍN" },
    { logoText: "Bufete Lértora", subtitleText: "DERECHO DE FAMILIA", titleText: "DRA. PAULA LÉRTORA" },
    { logoText: "Nexo Legal", subtitleText: "DERECHO LABORAL", titleText: "DR. JOAQUÍN BRAVO" },
  ],
  footerTexts: [
    "Toca para solicitar una reunión",
    "Agenda tu primera consulta",
    "Conversemos tu caso",
  ],
  actions: [
    { role: "primary", text: "Solicitar consulta", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/agenda" },
    { role: "contact", text: "WhatsApp", actionType: "whatsapp", icon: "fa-brands fa-whatsapp", target: "+56987654321" },
    { role: "contact", text: "Correo", actionType: "email", icon: "fa-regular fa-envelope", target: "contacto@example.com" },
    { role: "info", text: "Áreas de práctica", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/areas" },
    { role: "info", text: "Equipo", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/equipo" },
    { role: "location", text: "Ubicación", actionType: "location", icon: "fa-solid fa-location-dot", target: "https://maps.google.com/?q=estudio" },
    { role: "social", text: "LinkedIn", actionType: "url", icon: "fa-solid fa-globe", target: "https://linkedin.com/company/demo" },
  ],
  socialPlatforms: ["linkedin", "email", "whatsapp", "website"],
  avatars: [AVATARS.lawyer01, AVATARS.lawyer02, AVATARS.lawyer03],
  banners: [BANNERS.office01, BANNERS.office02],
  preferredThemes: ["black-gold", "executive-blue", "graphite"],
};

const RESTAURANT: IndustryDataset = {
  id: "restaurant",
  uiName: INDUSTRY_UI_NAMES.restaurant,
  category: INDUSTRY_CATEGORIES.restaurant,
  identities: [
    { logoText: "La Cocina", subtitleText: "RESTAURANTE", titleText: "CASA DE AUTOR" },
    { logoText: "Sal & Brasa", subtitleText: "PARRILLA", titleText: "COCINA A LA LEÑA" },
    { logoText: "Marea", subtitleText: "COCINA DE MAR", titleText: "PRODUCTO DEL DÍA" },
    { logoText: "Verde Limón", subtitleText: "COCINA DE AUTOR", titleText: "MENÚ DE TEMPORADA" },
  ],
  footerTexts: [
    "Toca para reservar tu mesa",
    "Reserva y conoce el menú",
    "Te esperamos hoy",
  ],
  actions: [
    { role: "primary", text: "Reservar mesa", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/reservar" },
    { role: "info", text: "Ver menú", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/menu" },
    { role: "contact", text: "WhatsApp", actionType: "whatsapp", icon: "fa-brands fa-whatsapp", target: "+56911223344" },
    { role: "contact", text: "Llamar", actionType: "phone", icon: "fa-solid fa-phone", target: "+56224455667" },
    { role: "location", text: "Ubicación", actionType: "location", icon: "fa-solid fa-location-dot", target: "https://maps.google.com/?q=restaurante" },
    { role: "social", text: "Instagram", actionType: "url", icon: "fa-brands fa-instagram", target: "https://instagram.com/demo.resto" },
    { role: "info", text: "Carta de vinos", actionType: "download", icon: "fa-solid fa-download", target: "https://example.com/carta.pdf" },
  ],
  socialPlatforms: ["instagram", "facebook", "whatsapp", "website"],
  avatars: [AVATARS.chef01, AVATARS.chef02],
  banners: [BANNERS.resto01, BANNERS.resto02],
  preferredThemes: ["burgundy-elegant", "black-gold", "ivory-gold"],
};

const BARBER: IndustryDataset = {
  id: "barber",
  uiName: INDUSTRY_UI_NAMES.barber,
  category: INDUSTRY_CATEGORIES.barber,
  identities: [
    { logoText: "StyleCut", subtitleText: "BARBERÍA", titleText: "CORTE Y BARBA" },
    { logoText: "Navaja", subtitleText: "BARBER SHOP", titleText: "ESTILO CLÁSICO" },
    { logoText: "Distrito 9", subtitleText: "BARBERÍA", titleText: "CORTE MODERNO" },
    { logoText: "Roble", subtitleText: "GROOMING", titleText: "CUIDADO MASCULINO" },
  ],
  footerTexts: [
    "Toca para reservar tu hora",
    "Agenda tu corte",
    "Reserva en segundos",
  ],
  actions: [
    { role: "primary", text: "Reservar cita", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/agenda" },
    { role: "contact", text: "WhatsApp", actionType: "whatsapp", icon: "fa-brands fa-whatsapp", target: "+56955667788" },
    { role: "info", text: "Servicios", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/servicios" },
    { role: "info", text: "Galería", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/galeria" },
    { role: "location", text: "Ubicación", actionType: "location", icon: "fa-solid fa-location-dot", target: "https://maps.google.com/?q=barberia" },
    { role: "social", text: "Instagram", actionType: "url", icon: "fa-brands fa-instagram", target: "https://instagram.com/demo.barber" },
    { role: "social", text: "TikTok", actionType: "url", icon: "fa-brands fa-tiktok", target: "https://tiktok.com/@demo.barber" },
  ],
  socialPlatforms: ["instagram", "tiktok", "whatsapp", "website"],
  avatars: [AVATARS.barber01, AVATARS.barber02, AVATARS.barber03],
  banners: [BANNERS.barbershop01, BANNERS.barbershop02],
  preferredThemes: ["graphite", "black-silver", "black-gold"],
};

export const INDUSTRY_DATASETS: Record<IndustryId, IndustryDataset> = {
  medical: MEDICAL,
  legal: LEGAL,
  restaurant: RESTAURANT,
  barber: BARBER,
};

export function getIndustryDataset(industry: IndustryId): IndustryDataset {
  const dataset = INDUSTRY_DATASETS[industry];
  if (!dataset) throw new Error(`Industria desconocida: ${industry}`);
  return dataset;
}

export function isIndustryId(value: string): value is IndustryId {
  return (INDUSTRY_IDS as readonly string[]).includes(value);
}
