/**
 * Template Factory — Datasets de industria y pools de assets
 * PASS C · generator-v1 + TF-F2-INDUSTRY-EXPANSION
 */

import type { ActionTypeId, IconClass, SocialPlatformId, ThemeId } from "./registries";

export const INDUSTRY_IDS = [
  "medical",
  "legal",
  "restaurant",
  "barber",
  "dental",
  "veterinary",
  "beauty",
  "spa",
  "hair_salon",
  "tattoo",
  "fitness",
  "coach",
  "consultant",
  "real_estate",
  "architect",
  "photographer",
  "creator",
  "influencer",
  "musician",
  "dj",
  "streamer",
  "hotel",
  "cafe",
  "nightlife",
  "jewelry",
  "automotive",
  "education",
  "events",
  "ecommerce_creator",
  "professional_services"
] as const;
export type IndustryId = (typeof INDUSTRY_IDS)[number];

export const INDUSTRY_UI_NAMES: Record<IndustryId, string> = {
  "medical": "Salud",
  "legal": "Legal",
  "restaurant": "Restaurantes",
  "barber": "Barberías",
  "dental": "Odontología",
  "veterinary": "Veterinaria",
  "beauty": "Salón de Belleza",
  "spa": "Spa & Bienestar",
  "hair_salon": "Peluquería",
  "tattoo": "Tatuajes",
  "fitness": "Fitness & Gym",
  "coach": "Coach Personal",
  "consultant": "Consultor de Negocios",
  "real_estate": "Agente Inmobiliario",
  "architect": "Arquitectura",
  "photographer": "Fotografía",
  "creator": "Creador de Contenido",
  "influencer": "Influencer",
  "musician": "Músico / Banda",
  "dj": "DJ / Productor",
  "streamer": "Streamer",
  "hotel": "Hotel / Alojamiento",
  "cafe": "Cafetería",
  "nightlife": "Vida Nocturna / Club",
  "jewelry": "Joyería",
  "automotive": "Automotriz",
  "education": "Educación / Cursos",
  "events": "Eventos / Bodas",
  "ecommerce_creator": "Tienda / E-commerce",
  "professional_services": "Servicios Profesionales"
};

export const INDUSTRY_CATEGORIES: Record<IndustryId, string> = {
  "medical": "Salud",
  "legal": "Legal",
  "restaurant": "Gastronomía",
  "barber": "Servicios",
  "dental": "Salud",
  "veterinary": "Salud",
  "beauty": "Belleza",
  "spa": "Belleza",
  "hair_salon": "Belleza",
  "tattoo": "Arte/Diseño",
  "fitness": "Deportes",
  "coach": "Desarrollo Profesional",
  "consultant": "Negocios",
  "real_estate": "Inmobiliaria",
  "architect": "Arquitectura",
  "photographer": "Fotografía",
  "creator": "Creador Digital",
  "influencer": "Creador Digital",
  "musician": "Música",
  "dj": "Música",
  "streamer": "Gaming/Entretenimiento",
  "hotel": "Hospitalidad",
  "cafe": "Gastronomía",
  "nightlife": "Entretenimiento",
  "jewelry": "Retail/Lujo",
  "automotive": "Automotriz",
  "education": "Educación",
  "events": "Eventos",
  "ecommerce_creator": "E-commerce",
  "professional_services": "Servicios Profesionales"
};

export type ActionRole = "primary" | "contact" | "info" | "location" | "social";

export interface ActionCandidate {
  role: ActionRole;
  text: string;
  actionType: ActionTypeId;
  icon: IconClass;
  target: string;
}

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

export interface IndustryMetadata {
  semanticCTAs: string[];
  suitableSections: string[];
  contentVocabulary: string[];
  prohibitedClaims: string[];
  actionCompatibility: string[];
  paletteCompatibility: string[];
  preferredRecipes: string[];
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
  metadata: IndustryMetadata;
}

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

export const ASSET_POOL: Record<string, AssetRef> = Object.fromEntries(
  [...Object.values(AVATARS), ...Object.values(BANNERS)].map((asset) => [asset.id, asset]),
);

export const INDUSTRY_DATASETS: Record<IndustryId, IndustryDataset> = {
  "medical": {
    id: "medical",
    uiName: INDUSTRY_UI_NAMES["medical"],
    category: INDUSTRY_CATEGORIES["medical"],
    identities: [
      { logoText: "Clínica Aurora", subtitleText: "MEDICINA GENERAL", titleText: "DRA. ELENA VARGAS" },
      { logoText: "Centro Vitalis", subtitleText: "MEDICINA INTERNA", titleText: "DR. MARTÍN SOLÍS" }
    ],
    footerTexts: ["Toca para agendar tu hora","Reserva tu consulta en línea"],
    actions: [
      { role: "primary", text: "Reservar consulta", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/reservas" }
    ],
    socialPlatforms: ["whatsapp","instagram","email","website"] as any,
    avatars: [AVATARS.doctor01, AVATARS.doctor02, AVATARS.doctor03],
    banners: [BANNERS.clinic01, BANNERS.clinic02],
    preferredThemes: ["premium-white","executive-blue","emerald-luxury"] as any,
    metadata: {
      semanticCTAs: ["Agendar Cita","Emergencias","Portal Paciente"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["salud","clínica","pacientes","bienestar","consulta","tratamiento"],
      prohibitedClaims: ["Diagnósticos definitivos por web","Curas milagrosas"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["clinical","executive"],
      preferredRecipes: ["hero","split"]
    }
  },
  "legal": {
    id: "legal",
    uiName: INDUSTRY_UI_NAMES["legal"],
    category: INDUSTRY_CATEGORIES["legal"],
    identities: [
      { logoText: "Vega & Asociados", subtitleText: "ABOGADA", titleText: "DRA. ISABEL VEGA" },
      { logoText: "Estudio Marín", subtitleText: "DERECHO CORPORATIVO", titleText: "DR. TOMÁS MARÍN" }
    ],
    footerTexts: ["Toca para solicitar una reunión","Conversemos tu caso"],
    actions: [
      { role: "primary", text: "Solicitar consulta", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/agenda" }
    ],
    socialPlatforms: ["linkedin","email","whatsapp","website"] as any,
    avatars: [AVATARS.lawyer01, AVATARS.lawyer02, AVATARS.lawyer03],
    banners: [BANNERS.office01, BANNERS.office02],
    preferredThemes: ["black-gold","executive-blue","graphite"] as any,
    metadata: {
      semanticCTAs: ["Evaluación de Caso","Contacto Legal","Áreas de Práctica"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["derecho","litigio","asesoría legal","defensa","contratos","corporativo"],
      prohibitedClaims: ["Promesa de resultados 100% ganadores","Tasas garantizadas"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["executive","luxury"],
      preferredRecipes: ["minimal","split"]
    }
  },
  "restaurant": {
    id: "restaurant",
    uiName: INDUSTRY_UI_NAMES["restaurant"],
    category: INDUSTRY_CATEGORIES["restaurant"],
    identities: [
      { logoText: "La Cocina", subtitleText: "RESTAURANTE", titleText: "CASA DE AUTOR" },
      { logoText: "Sal & Brasa", subtitleText: "PARRILLA", titleText: "COCINA A LA LEÑA" }
    ],
    footerTexts: ["Toca para reservar tu mesa","Te esperamos hoy"],
    actions: [
      { role: "primary", text: "Reservar mesa", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/reservar" }
    ],
    socialPlatforms: ["instagram","facebook","whatsapp","website"] as any,
    avatars: [AVATARS.chef01, AVATARS.chef02],
    banners: [BANNERS.resto01, BANNERS.resto02],
    preferredThemes: ["burgundy-elegant","black-gold","ivory-gold"] as any,
    metadata: {
      semanticCTAs: ["Ver Menú","Reservar Mesa","Pedir Delivery"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["menú","chef","reserva","experiencia","gastronomía","ingredientes"],
      prohibitedClaims: ["Declaraciones de salud falsas sobre ingredientes"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["warm","luxury"],
      preferredRecipes: ["grid","hero"]
    }
  },
  "barber": {
    id: "barber",
    uiName: INDUSTRY_UI_NAMES["barber"],
    category: INDUSTRY_CATEGORIES["barber"],
    identities: [
      { logoText: "StyleCut", subtitleText: "BARBERÍA", titleText: "CORTE Y BARBA" },
      { logoText: "Navaja", subtitleText: "BARBER SHOP", titleText: "ESTILO CLÁSICO" }
    ],
    footerTexts: ["Toca para reservar tu hora","Agenda tu corte"],
    actions: [
      { role: "primary", text: "Reservar cita", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/agenda" },
      { role: "contact", text: "Escribir por WhatsApp", actionType: "whatsapp", icon: "fa-brands fa-whatsapp", target: "+1234567" },
      { role: "info", text: "Lista de precios", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/precios" },
      { role: "location", text: "Cómo llegar", actionType: "location", icon: "fa-solid fa-location-dot", target: "Av. Principal 123" },
      { role: "social", text: "Galería de cortes", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/galeria" }
    ],
    socialPlatforms: ["instagram","tiktok","whatsapp","website"] as any,
    avatars: [AVATARS.barber01, AVATARS.barber02, AVATARS.barber03],
    banners: [BANNERS.barbershop01, BANNERS.barbershop02],
    preferredThemes: ["graphite","black-silver","black-gold"] as any,
    metadata: {
      semanticCTAs: ["Reservar Turno","Lista de Precios","Galería de Cortes"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["corte","barba","estilo","fade","navaja","grooming"],
      prohibitedClaims: ["Uso de imágenes que no correspondan a la calidad real"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["bold","dark"],
      preferredRecipes: ["bold","hero"]
    }
  },
  "dental": {
    id: "dental",
    uiName: INDUSTRY_UI_NAMES["dental"],
    category: INDUSTRY_CATEGORIES["dental"],
    identities: [
      { logoText: "Dental Care", subtitleText: "CLÍNICA DENTAL", titleText: "SONRISAS SANAS" },
      { logoText: "Implantes Pro", subtitleText: "ODONTOLOGÍA", titleText: "ESTÉTICA DENTAL" }
    ],
    footerTexts: ["Agenda tu limpieza","Sonríe con confianza"],
    actions: [
      { role: "primary", text: "Agendar revisión", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/agenda" }
    ],
    socialPlatforms: ["whatsapp","instagram"] as any,
    avatars: [AVATARS.doctor01, AVATARS.doctor02],
    banners: [BANNERS.clinic01],
    preferredThemes: ["premium-white","emerald-luxury"] as any,
    metadata: {
      semanticCTAs: ["Reservar Evaluación","Tratamientos","Emergencia Dental"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["implantes","ortodoncia","blanqueamiento","salud bucal"],
      prohibitedClaims: ["Resultados milagrosos en 1 día sin evidencia","Cura garantizada de periodontitis severa"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["clinical","light"],
      preferredRecipes: ["split","minimal"]
    }
  },
  "veterinary": {
    id: "veterinary",
    uiName: INDUSTRY_UI_NAMES["veterinary"],
    category: INDUSTRY_CATEGORIES["veterinary"],
    identities: [
      { logoText: "VetCenter", subtitleText: "CLÍNICA VETERINARIA", titleText: "CUIDADO ANIMAL" },
      { logoText: "Patitas", subtitleText: "HOSPITAL VETERINARIO", titleText: "ATENCIÓN 24/7" }
    ],
    footerTexts: ["Cuidamos a tu mascota","Reserva una consulta para tu peludo"],
    actions: [
      { role: "primary", text: "Agendar consulta", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/agenda" }
    ],
    socialPlatforms: ["whatsapp","instagram","facebook"] as any,
    avatars: [AVATARS.doctor03],
    banners: [BANNERS.clinic02],
    preferredThemes: ["emerald-luxury","premium-white"] as any,
    metadata: {
      semanticCTAs: ["Urgencias 24/7","Agendar Vacunación","Peluquería"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["mascotas","vacunación","urgencias","peluquería canina","salud animal"],
      prohibitedClaims: ["Garantizar recuperación en casos críticos terminales"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["clinical","warm"],
      preferredRecipes: ["hero","grid"]
    }
  },
  "beauty": {
    id: "beauty",
    uiName: INDUSTRY_UI_NAMES["beauty"],
    category: INDUSTRY_CATEGORIES["beauty"],
    identities: [
      { logoText: "Glow Studio", subtitleText: "BEAUTY SALON", titleText: "UÑAS & MAQUILLAJE" },
      { logoText: "Estética Bella", subtitleText: "CENTRO DE BELLEZA", titleText: "PIEL PERFECTA" }
    ],
    footerTexts: ["Realza tu belleza natural","Reserva tu sesión de belleza"],
    actions: [
      { role: "primary", text: "Reservar sesión", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/agenda" }
    ],
    socialPlatforms: ["instagram","tiktok","whatsapp"] as any,
    avatars: [AVATARS.barber01],
    banners: [BANNERS.barbershop02],
    preferredThemes: ["rose-gold","premium-white"] as any,
    metadata: {
      semanticCTAs: ["Reservar Turno","Servicios","Antes y Después"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["maquillaje","manicura","pestañas","skincare","estética"],
      prohibitedClaims: ["Promesas de cambios físicos imposibles","Uso de sustancias no reguladas"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["luxury","light"],
      preferredRecipes: ["minimal","split"]
    }
  },
  "spa": {
    id: "spa",
    uiName: INDUSTRY_UI_NAMES["spa"],
    category: INDUSTRY_CATEGORIES["spa"],
    identities: [
      { logoText: "Zen Spa", subtitleText: "RELAX & WELLNESS", titleText: "TERAPIAS HOLÍSTICAS" },
      { logoText: "Oasis", subtitleText: "SPA BOUTIQUE", titleText: "MASAJES & FACIALES" }
    ],
    footerTexts: ["Encuentra tu paz interior","Relájate con nosotros"],
    actions: [
      { role: "primary", text: "Agendar masaje", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/agenda" }
    ],
    socialPlatforms: ["instagram","whatsapp"] as any,
    avatars: [AVATARS.doctor02],
    banners: [BANNERS.clinic01],
    preferredThemes: ["ivory-gold","emerald-luxury"] as any,
    metadata: {
      semanticCTAs: ["Ver Catálogo","Reservar Masaje","Tarjetas de Regalo"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["masajes","relajación","bienestar","terapias","facial","holístico"],
      prohibitedClaims: ["Declarar que masajes curan enfermedades médicas severas"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["warm","luxury"],
      preferredRecipes: ["hero","minimal"]
    }
  },
  "hair_salon": {
    id: "hair_salon",
    uiName: INDUSTRY_UI_NAMES["hair_salon"],
    category: INDUSTRY_CATEGORIES["hair_salon"],
    identities: [
      { logoText: "Hair Studio", subtitleText: "PELUQUERÍA UNISEX", titleText: "COLOR & ESTILO" },
      { logoText: "Color Expert", subtitleText: "HAIR SALON", titleText: "TENDENCIAS" }
    ],
    footerTexts: ["Transforma tu look","Agenda tu cambio de color"],
    actions: [
      { role: "primary", text: "Agendar corte", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/agenda" }
    ],
    socialPlatforms: ["instagram","tiktok","whatsapp"] as any,
    avatars: [AVATARS.barber02],
    banners: [BANNERS.barbershop01],
    preferredThemes: ["black-silver","rose-gold"] as any,
    metadata: {
      semanticCTAs: ["Agendar Cita","Ver Trabajos","Precios"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["coloración","balayage","corte","estilismo","keratina"],
      prohibitedClaims: ["Garantizar restauración instantánea de cabello dañado extremo"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["bold","luxury"],
      preferredRecipes: ["split","grid"]
    }
  },
  "tattoo": {
    id: "tattoo",
    uiName: INDUSTRY_UI_NAMES["tattoo"],
    category: INDUSTRY_CATEGORIES["tattoo"],
    identities: [
      { logoText: "Ink Studio", subtitleText: "TATTOO PARLOR", titleText: "ARTE CORPORAL" },
      { logoText: "Blackwork", subtitleText: "TATUADOR", titleText: "CUSTOM DESIGNS" }
    ],
    footerTexts: ["Tu idea en la piel","Agenda tu sesión de tinta"],
    actions: [
      { role: "primary", text: "Cotizar tatuaje", actionType: "whatsapp", icon: "fa-brands fa-whatsapp", target: "+1234567" }
    ],
    socialPlatforms: ["instagram","tiktok","whatsapp"] as any,
    avatars: [AVATARS.barber03],
    banners: [BANNERS.barbershop02],
    preferredThemes: ["black-gold","graphite"] as any,
    metadata: {
      semanticCTAs: ["Cotizar Diseño","Portfolio","Cuidados"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["tatuaje","ink","piercing","diseño","blackwork","realismo"],
      prohibitedClaims: ["Garantizar ausencia total de dolor o riesgo de infección nulo"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["dark","bold"],
      preferredRecipes: ["bold","hero"]
    }
  },
  "fitness": {
    id: "fitness",
    uiName: INDUSTRY_UI_NAMES["fitness"],
    category: INDUSTRY_CATEGORIES["fitness"],
    identities: [
      { logoText: "Iron Gym", subtitleText: "CENTRO DE ENTRENAMIENTO", titleText: "FUERZA Y ACONDICIONAMIENTO" },
      { logoText: "FitLife", subtitleText: "CROSSFIT & HIIt", titleText: "TU MEJOR VERSIÓN" }
    ],
    footerTexts: ["Empieza hoy mismo","Únete a la comunidad fit"],
    actions: [
      { role: "primary", text: "Prueba gratis", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/agenda" }
    ],
    socialPlatforms: ["instagram","tiktok","youtube","whatsapp"] as any,
    avatars: [AVATARS.chef02],
    banners: [BANNERS.office02],
    preferredThemes: ["graphite","executive-blue"] as any,
    metadata: {
      semanticCTAs: ["Planes y Precios","Horarios","Clase de Prueba"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["entrenamiento","fuerza","crossfit","hiit","nutrición","gimnasio"],
      prohibitedClaims: ["Pérdida de peso mágica sin esfuerzo","Uso de anabólicos no regulados"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["athletic","dark"],
      preferredRecipes: ["hero","bold"]
    }
  },
  "coach": {
    id: "coach",
    uiName: INDUSTRY_UI_NAMES["coach"],
    category: INDUSTRY_CATEGORIES["coach"],
    identities: [
      { logoText: "Life Coach", subtitleText: "DESARROLLO PERSONAL", titleText: "MENTORÍA" },
      { logoText: "Business Coach", subtitleText: "ESTRATEGIA", titleText: "CRECIMIENTO ACELERADO" }
    ],
    footerTexts: ["Desbloquea tu potencial","Agenda tu sesión estratégica"],
    actions: [
      { role: "primary", text: "Agendar sesión 1:1", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/agenda" }
    ],
    socialPlatforms: ["linkedin","instagram","youtube"] as any,
    avatars: [AVATARS.lawyer01, AVATARS.lawyer02],
    banners: [BANNERS.office01],
    preferredThemes: ["executive-blue","premium-white"] as any,
    metadata: {
      semanticCTAs: ["Agendar Discovery Call","Programas","Podcast"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["mentoría","liderazgo","estrategia","crecimiento","mindset"],
      prohibitedClaims: ["Ingresos garantizados de 6 cifras en 30 días","Sectas o esquemas piramidales"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["executive","light"],
      preferredRecipes: ["minimal","split"]
    }
  },
  "consultant": {
    id: "consultant",
    uiName: INDUSTRY_UI_NAMES["consultant"],
    category: INDUSTRY_CATEGORIES["consultant"],
    identities: [
      { logoText: "Consulting Group", subtitleText: "ASESORÍA EMPRESARIAL", titleText: "OPTIMIZACIÓN DE PROCESOS" },
      { logoText: "Finanzas Pro", subtitleText: "CONSULTOR FINANCIERO", titleText: "ESTRATEGIA FISCAL" }
    ],
    footerTexts: ["Llevamos tu negocio al siguiente nivel","Hablemos de estrategia"],
    actions: [
      { role: "primary", text: "Contactar experto", actionType: "email", icon: "fa-regular fa-envelope", target: "info@example.com" }
    ],
    socialPlatforms: ["linkedin","website","email"] as any,
    avatars: [AVATARS.lawyer03],
    banners: [BANNERS.office02],
    preferredThemes: ["graphite","executive-blue"] as any,
    metadata: {
      semanticCTAs: ["Solicitar Propuesta","Nuestros Servicios","Casos de Éxito"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["consultoría","finanzas","estrategia","B2B","ROI","optimización"],
      prohibitedClaims: ["Promesas de evasión de impuestos","Asesoría financiera ilegal (Pump and dump)"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["executive","professional"],
      preferredRecipes: ["split","grid"]
    }
  },
  "real_estate": {
    id: "real_estate",
    uiName: INDUSTRY_UI_NAMES["real_estate"],
    category: INDUSTRY_CATEGORIES["real_estate"],
    identities: [
      { logoText: "Prime Properties", subtitleText: "BIENES RAÍCES", titleText: "PROPIEDADES EXCLUSIVAS" },
      { logoText: "Home Seekers", subtitleText: "AGENTE INMOBILIARIO", titleText: "TU NUEVO HOGAR" }
    ],
    footerTexts: ["Encuentra la casa de tus sueños","Inversiones inteligentes"],
    actions: [
      { role: "primary", text: "Ver propiedades", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/properties" }
    ],
    socialPlatforms: ["instagram","linkedin","whatsapp"] as any,
    avatars: [AVATARS.lawyer01],
    banners: [BANNERS.office01],
    preferredThemes: ["executive-blue","ivory-gold"] as any,
    metadata: {
      semanticCTAs: ["Propiedades Destacadas","Agendar Visita","Vender mi Propiedad"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["propiedades","venta","alquiler","inversión","inmuebles","bienes raíces"],
      prohibitedClaims: ["Rentabilidad asegurada sin riesgo en bienes raíces"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["luxury","executive"],
      preferredRecipes: ["hero","grid"]
    }
  },
  "architect": {
    id: "architect",
    uiName: INDUSTRY_UI_NAMES["architect"],
    category: INDUSTRY_CATEGORIES["architect"],
    identities: [
      { logoText: "Studio Arch", subtitleText: "ARQUITECTURA & DISEÑO", titleText: "ESPACIOS MODERNOS" },
      { logoText: "Línea Base", subtitleText: "ESTUDIO DE ARQUITECTURA", titleText: "DISEÑO SOSTENIBLE" }
    ],
    footerTexts: ["Diseñamos el futuro","Mira nuestro portafolio"],
    actions: [
      { role: "primary", text: "Ver portafolio", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/portfolio" }
    ],
    socialPlatforms: ["instagram","linkedin","website"] as any,
    avatars: [AVATARS.doctor03],
    banners: [BANNERS.office02],
    preferredThemes: ["graphite","premium-white"] as any,
    metadata: {
      semanticCTAs: ["Portafolio","Contacto","Servicios"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["diseño","arquitectura","proyectos","construcción","interiorismo"],
      prohibitedClaims: ["Garantizar aprobaciones de permisos imposibles"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["minimal","executive"],
      preferredRecipes: ["minimal","hero"]
    }
  },
  "photographer": {
    id: "photographer",
    uiName: INDUSTRY_UI_NAMES["photographer"],
    category: INDUSTRY_CATEGORIES["photographer"],
    identities: [
      { logoText: "Lente Mágico", subtitleText: "FOTÓGRAFO PROFESIONAL", titleText: "CAPTURANDO MOMENTOS" },
      { logoText: "Visual Arts", subtitleText: "FOTOGRAFÍA DE BODAS", titleText: "RETRATOS" }
    ],
    footerTexts: ["Tu historia en imágenes","Reserva tu sesión fotográfica"],
    actions: [
      { role: "primary", text: "Ver galería", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/gallery" }
    ],
    socialPlatforms: ["instagram","website","whatsapp"] as any,
    avatars: [AVATARS.chef01],
    banners: [BANNERS.barbershop01],
    preferredThemes: ["black-gold","premium-white"] as any,
    metadata: {
      semanticCTAs: ["Ver Portafolio","Reservar Sesión","Tarifas"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["sesión","boda","retrato","editorial","galería","fotografía"],
      prohibitedClaims: ["Apropiación de imágenes ajenas en el portfolio"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["editorial","dark"],
      preferredRecipes: ["hero","grid"]
    }
  },
  "creator": {
    id: "creator",
    uiName: INDUSTRY_UI_NAMES["creator"],
    category: INDUSTRY_CATEGORIES["creator"],
    identities: [
      { logoText: "Content Creator", subtitleText: "VLOGS & LIFESTYLE", titleText: "CREADOR DIGITAL" },
      { logoText: "Tech Reviewer", subtitleText: "GADGETS & TECH", titleText: "REVIEWS" }
    ],
    footerTexts: ["Sígueme en todas mis redes","Únete a la comunidad"],
    actions: [
      { role: "primary", text: "Ver último video", actionType: "url", icon: "fa-solid fa-globe", target: "https://youtube.com" }
    ],
    socialPlatforms: ["youtube","instagram","tiktok","twitter"] as any,
    avatars: [AVATARS.doctor01],
    banners: [BANNERS.resto01],
    preferredThemes: ["rose-gold","executive-blue"] as any,
    metadata: {
      semanticCTAs: ["Último Video","Mi Setup","Colaboraciones"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["video","vlog","suscríbete","comunidad","lifestyle","creador"],
      prohibitedClaims: ["Contenido explícito sexual (adult_creator_category policy: lawful only)","Promoción de esquemas fraudulentos"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["editorial","vibrant"],
      preferredRecipes: ["grid","hero"]
    }
  },
  "influencer": {
    id: "influencer",
    uiName: INDUSTRY_UI_NAMES["influencer"],
    category: INDUSTRY_CATEGORIES["influencer"],
    identities: [
      { logoText: "Fashion Icon", subtitleText: "MODA & ESTILO", titleText: "INFLUENCER" },
      { logoText: "Travel Blogger", subtitleText: "VIAJES & AVENTURA", titleText: "EXPLORANDO EL MUNDO" }
    ],
    footerTexts: ["Descubre mis recomendaciones","Explora mi estilo"],
    actions: [
      { role: "primary", text: "Mis favoritos", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/links" }
    ],
    socialPlatforms: ["instagram","tiktok","youtube","whatsapp"] as any,
    avatars: [AVATARS.barber01],
    banners: [BANNERS.clinic02],
    preferredThemes: ["rose-gold","premium-white"] as any,
    metadata: {
      semanticCTAs: ["Mis Favoritos de Amazon","Código de Descuento","Media Kit"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["moda","viajes","estilo","colaboración","haul","recomendaciones"],
      prohibitedClaims: ["Publicidad encubierta sin disclaimer","Sorteos falsos"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["luxury","light"],
      preferredRecipes: ["minimal","grid"]
    }
  },
  "musician": {
    id: "musician",
    uiName: INDUSTRY_UI_NAMES["musician"],
    category: INDUSTRY_CATEGORIES["musician"],
    identities: [
      { logoText: "Rock Band", subtitleText: "MÚSICA EN VIVO", titleText: "NUEVO SENCILLO DISPONIBLE" },
      { logoText: "Indie Artist", subtitleText: "CANTAUTOR", titleText: "GIRA 2026" }
    ],
    footerTexts: ["Escucha mi nueva música","Consigue tus entradas"],
    actions: [
      { role: "primary", text: "Escuchar en Spotify", actionType: "url", icon: "fa-solid fa-globe", target: "https://spotify.com" }
    ],
    socialPlatforms: ["instagram","youtube","twitter"] as any,
    avatars: [AVATARS.chef02],
    banners: [BANNERS.resto02],
    preferredThemes: ["graphite","burgundy-elegant"] as any,
    metadata: {
      semanticCTAs: ["Escuchar Nuevo Sencillo","Tour & Entradas","Merch Oficial"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["sencillo","álbum","gira","concierto","música","spotify"],
      prohibitedClaims: ["Reventa ilegal de entradas","Falsificación de identidad de artistas famosos"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["entertainment","dark"],
      preferredRecipes: ["hero","bold"]
    }
  },
  "dj": {
    id: "dj",
    uiName: INDUSTRY_UI_NAMES["dj"],
    category: INDUSTRY_CATEGORIES["dj"],
    identities: [
      { logoText: "DJ Set", subtitleText: "ELECTRO & HOUSE", titleText: "PRODUCTOR MUSICAL" },
      { logoText: "Bass Drop", subtitleText: "DUBSTEP & TRAP", titleText: "LIVE SETS" }
    ],
    footerTexts: ["Sigue mis sets en vivo","Contrataciones"],
    actions: [
      { role: "primary", text: "Escuchar en Soundcloud", actionType: "url", icon: "fa-solid fa-globe", target: "https://soundcloud.com" }
    ],
    socialPlatforms: ["instagram","youtube","whatsapp"] as any,
    avatars: [AVATARS.barber03],
    banners: [BANNERS.barbershop01],
    preferredThemes: ["black-gold","executive-blue"] as any,
    metadata: {
      semanticCTAs: ["Último Mix","Booking / Contrataciones","Fechas"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["set","mix","club","fiesta","producción","booking"],
      prohibitedClaims: ["Promoción de estupefacientes en fiestas"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["entertainment","dark"],
      preferredRecipes: ["bold","hero"]
    }
  },
  "streamer": {
    id: "streamer",
    uiName: INDUSTRY_UI_NAMES["streamer"],
    category: INDUSTRY_CATEGORIES["streamer"],
    identities: [
      { logoText: "Pro Gamer", subtitleText: "FPS & BATTLE ROYALE", titleText: "STREAMER EN TWITCH" },
      { logoText: "Variety Streamer", subtitleText: "JUST CHATTING & JUEGOS", titleText: "EN VIVO TODOS LOS DÍAS" }
    ],
    footerTexts: ["Únete a la transmisión","Sígueme en mis directos"],
    actions: [
      { role: "primary", text: "Ver en Twitch", actionType: "url", icon: "fa-solid fa-globe", target: "https://twitch.tv" }
    ],
    socialPlatforms: ["twitter","youtube","instagram"] as any,
    avatars: [AVATARS.lawyer02],
    banners: [BANNERS.office01],
    preferredThemes: ["executive-blue","graphite"] as any,
    metadata: {
      semanticCTAs: ["Ver en Vivo","Únete al Discord","Donaciones"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["stream","twitch","gaming","directo","comunidad","discord"],
      prohibitedClaims: ["betting_entertainment_category: No apuestas, no gambling, no fake odds","Toxicidad extrema/Odio"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["entertainment","gaming_entertainment"],
      preferredRecipes: ["grid","hero"]
    }
  },
  "hotel": {
    id: "hotel",
    uiName: INDUSTRY_UI_NAMES["hotel"],
    category: INDUSTRY_CATEGORIES["hotel"],
    identities: [
      { logoText: "Boutique Hotel", subtitleText: "ALOJAMIENTO EXCLUSIVO", titleText: "RELAX & CONFORT" },
      { logoText: "Hostel Life", subtitleText: "BACKPACKERS", titleText: "TU CASA EN LA CIUDAD" }
    ],
    footerTexts: ["Reserva tu estadía","Descubre nuestro hotel"],
    actions: [
      { role: "primary", text: "Reservar habitación", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/reservar" }
    ],
    socialPlatforms: ["instagram","facebook","website"] as any,
    avatars: [AVATARS.chef01],
    banners: [BANNERS.resto01],
    preferredThemes: ["ivory-gold","premium-white"] as any,
    metadata: {
      semanticCTAs: ["Reservar Habitación","Nuestras Instalaciones","Ubicación"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["hotel","habitación","reserva","vacaciones","hospedaje","turismo"],
      prohibitedClaims: ["Garantizar disponibilidad irreal","Falsas estrellas de calificación"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["hospitality","luxury"],
      preferredRecipes: ["hero","grid"]
    }
  },
  "cafe": {
    id: "cafe",
    uiName: INDUSTRY_UI_NAMES["cafe"],
    category: INDUSTRY_CATEGORIES["cafe"],
    identities: [
      { logoText: "Coffee Shop", subtitleText: "CAFÉ DE ESPECIALIDAD", titleText: "DESAYUNOS & BRUNCH" },
      { logoText: "Pastelería Dulce", subtitleText: "BAKERY & CAFE", titleText: "HECHO CON AMOR" }
    ],
    footerTexts: ["Ven a disfrutar un buen café","Tu pausa diaria"],
    actions: [
      { role: "primary", text: "Ver el menú", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/menu" }
    ],
    socialPlatforms: ["instagram","facebook","whatsapp"] as any,
    avatars: [AVATARS.chef02],
    banners: [BANNERS.resto02],
    preferredThemes: ["burgundy-elegant","ivory-gold"] as any,
    metadata: {
      semanticCTAs: ["Menú","Pedir para Llevar","Nuestra Ubicación"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["café","brunch","pastelería","espresso","latte","desayuno"],
      prohibitedClaims: ["Afirmaciones falsas de certificaciones orgánicas/fair-trade"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["warm","hospitality"],
      preferredRecipes: ["minimal","split"]
    }
  },
  "nightlife": {
    id: "nightlife",
    uiName: INDUSTRY_UI_NAMES["nightlife"],
    category: INDUSTRY_CATEGORIES["nightlife"],
    identities: [
      { logoText: "Night Club", subtitleText: "DISCOTECA", titleText: "LA MEJOR FIESTA" },
      { logoText: "Lounge Bar", subtitleText: "COCTELES & MÚSICA", titleText: "AMBIENTE EXCLUSIVO" }
    ],
    footerTexts: ["Reserva tu mesa VIP","La noche te espera"],
    actions: [
      { role: "primary", text: "Comprar entradas", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/tickets" }
    ],
    socialPlatforms: ["instagram","whatsapp","facebook"] as any,
    avatars: [AVATARS.barber01],
    banners: [BANNERS.barbershop01],
    preferredThemes: ["black-gold","graphite"] as any,
    metadata: {
      semanticCTAs: ["Lista de Invitados","Reserva de Mesas VIP","Próximos Eventos"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["fiesta","club","vip","djs","cocteles","noche"],
      prohibitedClaims: ["Falsa promoción de consumo excesivo de alcohol","Venta a menores","Apuestas ilegales"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["entertainment","dark"],
      preferredRecipes: ["hero","bold"]
    }
  },
  "jewelry": {
    id: "jewelry",
    uiName: INDUSTRY_UI_NAMES["jewelry"],
    category: INDUSTRY_CATEGORIES["jewelry"],
    identities: [
      { logoText: "Fine Jewelry", subtitleText: "DISEÑO EXCLUSIVO", titleText: "DIAMANTES & ORO" },
      { logoText: "Plata Artesanal", subtitleText: "JOYERÍA CONTEMPORÁNEA", titleText: "HECHO A MANO" }
    ],
    footerTexts: ["Encuentra la joya perfecta","Colecciones únicas"],
    actions: [
      { role: "primary", text: "Ver catálogo", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/catalogo" }
    ],
    socialPlatforms: ["instagram","facebook","website"] as any,
    avatars: [AVATARS.doctor02],
    banners: [BANNERS.office01],
    preferredThemes: ["rose-gold","black-gold"] as any,
    metadata: {
      semanticCTAs: ["Ver Colección","Anillos de Compromiso","Asesoría Personalizada"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["joyas","oro","plata","diamantes","anillos","collares"],
      prohibitedClaims: ["Falsificación de certificaciones de gemas","Promocionar bisutería barata como oro macizo"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["luxury","light"],
      preferredRecipes: ["minimal","grid"]
    }
  },
  "automotive": {
    id: "automotive",
    uiName: INDUSTRY_UI_NAMES["automotive"],
    category: INDUSTRY_CATEGORIES["automotive"],
    identities: [
      { logoText: "Auto Service", subtitleText: "MECÁNICA GENERAL", titleText: "TU AUTO EN BUENAS MANOS" },
      { logoText: "Car Wash Premium", subtitleText: "ESTÉTICA VEHICULAR", titleText: "DETAILING" }
    ],
    footerTexts: ["Agenda tu servicio automotriz","Cuidamos tu vehículo"],
    actions: [
      { role: "primary", text: "Agendar servicio", actionType: "booking", icon: "fa-regular fa-calendar", target: "https://example.com/agenda" }
    ],
    socialPlatforms: ["whatsapp","facebook","instagram"] as any,
    avatars: [AVATARS.barber02],
    banners: [BANNERS.office02],
    preferredThemes: ["graphite","executive-blue"] as any,
    metadata: {
      semanticCTAs: ["Agendar Mantenimiento","Cotizar Reparación","Ubicación del Taller"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["mecánica","detailing","servicio","autos","reparación","mantenimiento"],
      prohibitedClaims: ["Garantías mecánicas falsas","Venta de vehículos robados/sin papeles"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["dark","athletic"],
      preferredRecipes: ["split","bold"]
    }
  },
  "education": {
    id: "education",
    uiName: INDUSTRY_UI_NAMES["education"],
    category: INDUSTRY_CATEGORIES["education"],
    identities: [
      { logoText: "Academia Online", subtitleText: "CURSOS & CERTIFICACIONES", titleText: "APRENDE A TU RITMO" },
      { logoText: "Instituto de Idiomas", subtitleText: "INGLÉS & MÁS", titleText: "DOMINA UN NUEVO IDIOMA" }
    ],
    footerTexts: ["Inicia tu aprendizaje hoy","Impulsa tu carrera"],
    actions: [
      { role: "primary", text: "Ver cursos", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/cursos" }
    ],
    socialPlatforms: ["linkedin","youtube","instagram","facebook"] as any,
    avatars: [AVATARS.lawyer01],
    banners: [BANNERS.office01],
    preferredThemes: ["executive-blue","premium-white"] as any,
    metadata: {
      semanticCTAs: ["Catálogo de Cursos","Inscripciones","Campus Virtual"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["cursos","aprender","certificación","academia","clases","estudiar"],
      prohibitedClaims: ["Falsas acreditaciones universitarias","Promesas de empleo asegurado post-curso 100% irreales"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["professional","light"],
      preferredRecipes: ["grid","minimal"]
    }
  },
  "events": {
    id: "events",
    uiName: INDUSTRY_UI_NAMES["events"],
    category: INDUSTRY_CATEGORIES["events"],
    identities: [
      { logoText: "Wedding Planner", subtitleText: "DISEÑO DE BODAS", titleText: "TU DÍA INOLVIDABLE" },
      { logoText: "Eventos Corporativos", subtitleText: "PRODUCCIÓN", titleText: "EVENTOS DE ALTO IMPACTO" }
    ],
    footerTexts: ["Hacemos tu evento realidad","Cotiza con nosotros"],
    actions: [
      { role: "primary", text: "Solicitar cotización", actionType: "whatsapp", icon: "fa-brands fa-whatsapp", target: "+123456" }
    ],
    socialPlatforms: ["instagram","whatsapp","website"] as any,
    avatars: [AVATARS.chef01],
    banners: [BANNERS.resto01],
    preferredThemes: ["rose-gold","ivory-gold"] as any,
    metadata: {
      semanticCTAs: ["Cotizar Evento","Galería de Eventos","Servicios"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["bodas","eventos","organización","celebración","corporativo","catering"],
      prohibitedClaims: ["Uso de fotos de eventos ajenos como propios"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["hospitality","luxury"],
      preferredRecipes: ["hero","split"]
    }
  },
  "ecommerce_creator": {
    id: "ecommerce_creator",
    uiName: INDUSTRY_UI_NAMES["ecommerce_creator"],
    category: INDUSTRY_CATEGORIES["ecommerce_creator"],
    identities: [
      { logoText: "Tienda Online", subtitleText: "PRODUCTOS EXCLUSIVOS", titleText: "COMPRA FÁCIL" },
      { logoText: "Marca Independiente", subtitleText: "HECHO A MANO", titleText: "ENVÍOS A TODO EL PAÍS" }
    ],
    footerTexts: ["Descubre nuestros productos","Compra seguro online"],
    actions: [
      { role: "primary", text: "Ir a la tienda", actionType: "url", icon: "fa-solid fa-globe", target: "https://example.com/tienda" }
    ],
    socialPlatforms: ["instagram","facebook","tiktok","whatsapp"] as any,
    avatars: [AVATARS.doctor03],
    banners: [BANNERS.clinic02],
    preferredThemes: ["premium-white","black-gold"] as any,
    metadata: {
      semanticCTAs: ["Ir a la Tienda","Ofertas del Mes","Atención al Cliente"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["comprar","tienda","envíos","ofertas","productos","catálogo"],
      prohibitedClaims: ["Dropshipping fraudulento","Productos falsificados"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["universal","light"],
      preferredRecipes: ["grid","minimal"]
    }
  },
  "professional_services": {
    id: "professional_services",
    uiName: INDUSTRY_UI_NAMES["professional_services"],
    category: INDUSTRY_CATEGORIES["professional_services"],
    identities: [
      { logoText: "Servicios IT", subtitleText: "SOPORTE Y REDES", titleText: "SOLUCIONES TECNOLÓGICAS" },
      { logoText: "Contadores Asoc.", subtitleText: "ASESORÍA FISCAL", titleText: "TRANQUILIDAD FINANCIERA" }
    ],
    footerTexts: ["Soluciones para tu negocio","Confía en los expertos"],
    actions: [
      { role: "primary", text: "Contactar", actionType: "email", icon: "fa-regular fa-envelope", target: "info@example.com" }
    ],
    socialPlatforms: ["linkedin","website","whatsapp"] as any,
    avatars: [AVATARS.lawyer02],
    banners: [BANNERS.office02],
    preferredThemes: ["graphite","executive-blue"] as any,
    metadata: {
      semanticCTAs: ["Nuestros Servicios","Solicitar Asesoría","Portal de Clientes"],
      suitableSections: ["Hero", "Actions", "Social", "Footer"],
      contentVocabulary: ["servicios","soporte","soluciones","asesoría","profesional","tecnología"],
      prohibitedClaims: ["Hackeo ético ilegal","Prácticas contables ilícitas"],
      actionCompatibility: ["url", "booking", "whatsapp", "email", "phone", "location", "download"],
      paletteCompatibility: ["professional","executive"],
      preferredRecipes: ["split","hero"]
    }
  }
};

export function getIndustryDataset(industry: IndustryId): IndustryDataset {
  const dataset = INDUSTRY_DATASETS[industry];
  if (!dataset) throw new Error(`Industria desconocida: ${industry}`);
  return dataset;
}

export function isIndustryId(value: string): value is IndustryId {
  return (INDUSTRY_IDS as readonly string[]).includes(value as IndustryId);
}
