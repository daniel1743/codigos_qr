import type {
  BasicEditorAdapterContentV1,
  BasicEditorAdapterLinkV1,
  BasicEditorAdapterSocialV1,
} from "@/lib/basic-editor-adapter";
import type {
  OnboardingIntentV1,
  PrimaryActionType,
  PrimaryGoal,
  VisualPersonality,
} from "@/lib/parametric-engine";
import type { CardCtaLabel } from "@/types/basic-templates";
import barberAvatar from "./assets/barber-avatar.svg?no-inline";
import barberBanner from "./assets/barber-banner.svg?no-inline";
import blacksmithAvatar from "./assets/blacksmith-avatar.svg?no-inline";
import blacksmithBanner from "./assets/blacksmith-banner.svg?no-inline";
import creatorAvatar from "./assets/creator-avatar.svg?no-inline";
import creatorBanner from "./assets/creator-banner.svg?no-inline";
import fitnessAvatar from "./assets/fitness-avatar.svg?no-inline";
import fitnessBanner from "./assets/fitness-banner.svg?no-inline";
import gardenerAvatar from "./assets/gardener-avatar.svg?no-inline";
import gardenerBanner from "./assets/gardener-banner.svg?no-inline";
import lawyerAvatar from "./assets/lawyer-avatar.svg?no-inline";
import lawyerBanner from "./assets/lawyer-banner.svg?no-inline";
import localAvatar from "./assets/local-avatar.svg?no-inline";
import localBanner from "./assets/local-banner.svg?no-inline";
import photographerAvatar from "./assets/photographer-avatar.svg?no-inline";
import photographerBanner from "./assets/photographer-banner.svg?no-inline";
import plumberAvatar from "./assets/plumber-avatar.svg?no-inline";
import plumberBanner from "./assets/plumber-banner.svg?no-inline";
import restaurantAvatar from "./assets/restaurant-avatar.svg?no-inline";
import restaurantBanner from "./assets/restaurant-banner.svg?no-inline";
import wellnessAvatar from "./assets/wellness-avatar.svg?no-inline";
import wellnessBanner from "./assets/wellness-banner.svg?no-inline";

export interface EngineLabBusinessFixture {
  readonly id: string;
  readonly label: string;
  readonly businessType: string;
  readonly name: string;
  readonly profession: string;
  readonly bio: string;
  readonly primaryGoal: PrimaryGoal;
  readonly personality: VisualPersonality;
  readonly primaryAction: {
    readonly type: PrimaryActionType;
    readonly value: string;
    readonly label: string;
    readonly description: string;
    readonly cardCtaLabel: CardCtaLabel;
  };
  readonly links: readonly Omit<BasicEditorAdapterLinkV1, "imageUrl">[];
  readonly socials: readonly BasicEditorAdapterSocialV1[];
  readonly assets: {
    readonly avatar: string;
    readonly banner: string;
    readonly cardPalette: readonly [string, string, string];
  };
}

export interface EngineLabDraft {
  readonly fixtureId: string;
  readonly businessType: string;
  readonly name: string;
  readonly profession: string;
  readonly bio: string;
  readonly primaryGoal: PrimaryGoal;
  readonly personality: VisualPersonality;
  readonly actionType: PrimaryActionType;
  readonly actionValue: string;
  readonly primaryActionLabel: string;
  readonly lockPrimaryCta: boolean;
  readonly hasAvatar: boolean;
  readonly hasBanner: boolean;
  readonly hasCardMedia: boolean;
}

const FIXTURES: readonly EngineLabBusinessFixture[] = [
  {
    id: "wellness",
    label: "Bienestar",
    businessType: "professional",
    name: "daniel falcon",
    profession: "agente de binestar",
    bio: "Acompañamiento cercano para construir hábitos de bienestar con calma, claridad y propósito.",
    primaryGoal: "whatsapp",
    personality: "professional",
    primaryAction: {
      type: "whatsapp",
      value: "+56940000010",
      label: "Hablar por WhatsApp",
      description: "Conversemos sobre el acompañamiento que necesitas.",
      cardCtaLabel: "Más información",
    },
    links: [
      {
        id: "acompanamiento",
        label: "Acompañamiento personalizado",
        url: "https://example.com/daniel-falcon/acompanamiento",
        platform: "website",
        description: "Un proceso práctico adaptado a tu momento.",
      },
      {
        id: "enfoque",
        label: "Conocer mi enfoque",
        url: "https://example.com/daniel-falcon/enfoque",
        platform: "website",
        description: "Hábitos, escucha y objetivos sostenibles.",
      },
      {
        id: "conversar",
        label: "Cómo puedo ayudarte",
        url: "https://wa.me/56940000010",
        platform: "whatsapp",
        description: "Escríbeme para resolver dudas antes de comenzar.",
      },
    ],
    socials: [
      {
        id: "instagram",
        platform: "instagram",
        url: "https://instagram.com/danielfalconbienestar",
      },
      { id: "whatsapp", platform: "whatsapp", url: "https://wa.me/56940000010" },
    ],
    assets: {
      avatar: wellnessAvatar,
      banner: wellnessBanner,
      cardPalette: ["#284b53", "#89b9a5", "#d6e8a7"],
    },
  },
  {
    id: "plumber",
    label: "Fontanero",
    businessType: "professional",
    name: "Aguasur Servicios",
    profession: "Gasfiter certificado",
    bio: "Reparaciones sanitarias, filtraciones e instalaciones con respuesta clara y puntual.",
    primaryGoal: "whatsapp",
    personality: "professional",
    primaryAction: {
      type: "whatsapp",
      value: "+56941001001",
      label: "Pedir visita técnica",
      description: "Cuéntanos qué ocurre y coordinamos una visita.",
      cardCtaLabel: "Más información",
    },
    links: [
      {
        id: "emergencias",
        label: "Urgencias y filtraciones",
        url: "https://example.com/aguasur/urgencias",
        platform: "whatsapp",
        description: "Diagnóstico de fugas, llaves y cañerías.",
      },
      {
        id: "instalaciones",
        label: "Instalaciones sanitarias",
        url: "https://example.com/aguasur/instalaciones",
        platform: "website",
        description: "Baños, cocinas, termos y redes de agua.",
      },
      {
        id: "cobertura",
        label: "Cobertura y horarios",
        url: "https://example.com/aguasur/cobertura",
        platform: "website",
        description: "Sectores atendidos y disponibilidad semanal.",
      },
    ],
    socials: [
      { id: "whatsapp", platform: "whatsapp", url: "https://wa.me/56941001001" },
      { id: "facebook", platform: "facebook", url: "https://facebook.com/aguasurservicios" },
    ],
    assets: {
      avatar: plumberAvatar,
      banner: plumberBanner,
      cardPalette: ["#073b4c", "#18a6c7", "#f7b731"],
    },
  },
  {
    id: "gardener",
    label: "Jardinero",
    businessType: "professional",
    name: "Jardines Aurora",
    profession: "Jardinera paisajista",
    bio: "Diseño, recuperación y mantención de jardines para hogares y pequeños negocios.",
    primaryGoal: "leads",
    personality: "professional",
    primaryAction: {
      type: "website",
      value: "https://example.com/jardines-aurora/evaluacion",
      label: "Solicitar evaluación",
      description: "Cuéntame sobre tu espacio y coordinemos una visita.",
      cardCtaLabel: "Más información",
    },
    links: [
      {
        id: "diseno",
        label: "Diseño y renovación",
        url: "https://example.com/jardines-aurora/diseno",
        platform: "website",
        description: "Propuestas verdes pensadas para tu espacio.",
      },
      {
        id: "proyectos",
        label: "Jardines recientes",
        url: "https://instagram.com/jardinesaurora",
        platform: "instagram",
        description: "Antes y después de proyectos residenciales.",
      },
      {
        id: "temporada",
        label: "Cuidados de temporada",
        url: "https://example.com/jardines-aurora/consejos",
        platform: "website",
        description: "Consejos simples para un jardín sano.",
      },
    ],
    socials: [
      { id: "instagram", platform: "instagram", url: "https://instagram.com/jardinesaurora" },
      { id: "whatsapp", platform: "whatsapp", url: "https://wa.me/56942002002" },
    ],
    assets: {
      avatar: gardenerAvatar,
      banner: gardenerBanner,
      cardPalette: ["#173d2b", "#78a565", "#dce8be"],
    },
  },
  {
    id: "blacksmith",
    label: "Herrero",
    businessType: "professional",
    name: "Forja Norte",
    profession: "Herrería y metal a medida",
    bio: "Portones, estructuras y mobiliario metálico fabricados con oficio y terminaciones durables.",
    primaryGoal: "leads",
    personality: "modern",
    primaryAction: {
      type: "whatsapp",
      value: "+56943003003",
      label: "Cotizar proyecto",
      description: "Envíanos medidas o una idea inicial para cotizar.",
      cardCtaLabel: "Más información",
    },
    links: [
      {
        id: "estructuras",
        label: "Estructuras y portones",
        url: "https://example.com/forja-norte/estructuras",
        platform: "website",
        description: "Fabricación e instalación para cada espacio.",
      },
      {
        id: "mobiliario",
        label: "Mobiliario metálico",
        url: "https://example.com/forja-norte/mobiliario",
        platform: "instagram",
        description: "Mesas, repisas y piezas personalizadas.",
      },
      {
        id: "proceso",
        label: "Nuestro proceso",
        url: "https://example.com/forja-norte/proceso",
        platform: "website",
        description: "Diseño, fabricación, acabado e instalación.",
      },
    ],
    socials: [
      { id: "instagram", platform: "instagram", url: "https://instagram.com/forjanorte" },
      { id: "whatsapp", platform: "whatsapp", url: "https://wa.me/56943003003" },
    ],
    assets: {
      avatar: blacksmithAvatar,
      banner: blacksmithBanner,
      cardPalette: ["#202226", "#b14b1e", "#f4a04e"],
    },
  },
  {
    id: "lawyer",
    label: "Abogado",
    businessType: "professional",
    name: "Estudio Valdés",
    profession: "Abogada civil y laboral",
    bio: "Orientación jurídica directa, rigurosa y cercana para personas y pequeñas empresas.",
    primaryGoal: "booking",
    personality: "elegant",
    primaryAction: {
      type: "booking",
      value: "https://example.com/estudio-valdes/agenda",
      label: "Agendar consulta",
      description: "Reserva una primera conversación confidencial.",
      cardCtaLabel: "Reservar",
    },
    links: [
      {
        id: "areas",
        label: "Áreas de práctica",
        url: "https://example.com/estudio-valdes/areas",
        platform: "website",
        description: "Asesoría civil, laboral y contractual.",
      },
      {
        id: "consulta",
        label: "Cómo funciona la consulta",
        url: "https://example.com/estudio-valdes/consulta",
        platform: "website",
        description: "Etapas, documentos y honorarios transparentes.",
      },
      {
        id: "credenciales",
        label: "Experiencia profesional",
        url: "https://linkedin.com/in/estudiovaldes",
        platform: "linkedin",
        description: "Trayectoria, formación y enfoque de trabajo.",
      },
    ],
    socials: [
      { id: "linkedin", platform: "linkedin", url: "https://linkedin.com/in/estudiovaldes" },
      { id: "email", platform: "email", url: "mailto:contacto@estudiovaldes.example" },
    ],
    assets: {
      avatar: lawyerAvatar,
      banner: lawyerBanner,
      cardPalette: ["#111f3b", "#44618f", "#d5b45a"],
    },
  },
  {
    id: "photographer",
    label: "Fotógrafo",
    businessType: "creator",
    name: "Luz Norte",
    profession: "Fotógrafa de retratos y marcas",
    bio: "Historias visuales honestas para personas, emprendimientos y equipos creativos.",
    primaryGoal: "portfolio",
    personality: "premium",
    primaryAction: {
      type: "website",
      value: "https://example.com/luz-norte/portafolio",
      label: "Ver portafolio",
      description: "Explora retratos, campañas y sesiones editoriales.",
      cardCtaLabel: "Ver mi trabajo",
    },
    links: [
      {
        id: "retratos",
        label: "Retratos editoriales",
        url: "https://example.com/luz-norte/retratos",
        platform: "website",
        description: "Sesiones personales con dirección sensible.",
      },
      {
        id: "marcas",
        label: "Fotografía para marcas",
        url: "https://example.com/luz-norte/marcas",
        platform: "instagram",
        description: "Campañas y contenido con identidad propia.",
      },
      {
        id: "sesiones",
        label: "Preparar una sesión",
        url: "https://example.com/luz-norte/guia",
        platform: "website",
        description: "Una guía breve de tiempos, vestuario y entrega.",
      },
    ],
    socials: [
      { id: "instagram", platform: "instagram", url: "https://instagram.com/luznorte" },
      { id: "email", platform: "email", url: "mailto:hola@luznorte.example" },
    ],
    assets: {
      avatar: photographerAvatar,
      banner: photographerBanner,
      cardPalette: ["#4b244a", "#d1766d", "#f4c35e"],
    },
  },
  {
    id: "barber",
    label: "Barbero",
    businessType: "beauty",
    name: "Barba Sur",
    profession: "Barbería clásica y contemporánea",
    bio: "Cortes, barba y cuidado personal con técnica precisa y atención sin apuro.",
    primaryGoal: "booking",
    personality: "modern",
    primaryAction: {
      type: "booking",
      value: "https://example.com/barba-sur/reservas",
      label: "Reservar hora",
      description: "Elige servicio, profesional y horario disponible.",
      cardCtaLabel: "Reservar",
    },
    links: [
      {
        id: "servicios",
        label: "Cortes y servicios",
        url: "https://example.com/barba-sur/servicios",
        platform: "website",
        description: "Corte, barba, perfilado y cuidado capilar.",
      },
      {
        id: "estilos",
        label: "Estilos recientes",
        url: "https://instagram.com/barbasur",
        platform: "instagram",
        description: "Referencias y resultados del equipo.",
      },
      {
        id: "ubicacion",
        label: "Ubicación y horarios",
        url: "https://example.com/barba-sur/local",
        platform: "website",
        description: "Visítanos en el barrio y llega a tiempo.",
      },
    ],
    socials: [
      { id: "instagram", platform: "instagram", url: "https://instagram.com/barbasur" },
      { id: "whatsapp", platform: "whatsapp", url: "https://wa.me/56945005005" },
    ],
    assets: {
      avatar: barberAvatar,
      banner: barberBanner,
      cardPalette: ["#231b1d", "#8f2d36", "#e6b35c"],
    },
  },
  {
    id: "restaurant",
    label: "Restaurante",
    businessType: "food",
    name: "Mesa Brava",
    profession: "Cocina de temporada",
    bio: "Producto local, fuego y una carta breve que cambia con cada estación.",
    primaryGoal: "booking",
    personality: "premium",
    primaryAction: {
      type: "booking",
      value: "https://example.com/mesa-brava/reservas",
      label: "Reservar mesa",
      description: "Selecciona fecha, hora y número de personas.",
      cardCtaLabel: "Reservar",
    },
    links: [
      {
        id: "carta",
        label: "Carta de temporada",
        url: "https://example.com/mesa-brava/carta",
        platform: "website",
        description: "Platos, vinos y opciones vegetarianas.",
      },
      {
        id: "experiencia",
        label: "La experiencia Mesa Brava",
        url: "https://instagram.com/mesabrava",
        platform: "instagram",
        description: "Cocina abierta, productores y sobremesa.",
      },
      {
        id: "ubicacion",
        label: "Cómo llegar",
        url: "https://example.com/mesa-brava/ubicacion",
        platform: "website",
        description: "Dirección, estacionamientos y horarios.",
      },
    ],
    socials: [
      { id: "instagram", platform: "instagram", url: "https://instagram.com/mesabrava" },
      { id: "whatsapp", platform: "whatsapp", url: "https://wa.me/56946006006" },
    ],
    assets: {
      avatar: restaurantAvatar,
      banner: restaurantBanner,
      cardPalette: ["#743728", "#d48455", "#f5c779"],
    },
  },
  {
    id: "fitness",
    label: "Fitness coach",
    businessType: "fitness",
    name: "Pulso Studio",
    profession: "Entrenadora personal",
    bio: "Entrenamiento progresivo y hábitos sostenibles para ganar fuerza y energía real.",
    primaryGoal: "leads",
    personality: "energetic",
    primaryAction: {
      type: "booking",
      value: "https://example.com/pulso-studio/evaluacion",
      label: "Agendar evaluación",
      description: "Revisemos tus objetivos y punto de partida.",
      cardCtaLabel: "Reservar",
    },
    links: [
      {
        id: "planes",
        label: "Planes de entrenamiento",
        url: "https://example.com/pulso-studio/planes",
        platform: "website",
        description: "Opciones presenciales y acompañamiento online.",
      },
      {
        id: "metodo",
        label: "Método Pulso",
        url: "https://instagram.com/pulsostudio",
        platform: "instagram",
        description: "Fuerza, movilidad y progreso medible.",
      },
      {
        id: "historias",
        label: "Historias de progreso",
        url: "https://example.com/pulso-studio/progreso",
        platform: "website",
        description: "Procesos reales, consistentes y sostenibles.",
      },
    ],
    socials: [
      { id: "instagram", platform: "instagram", url: "https://instagram.com/pulsostudio" },
      { id: "whatsapp", platform: "whatsapp", url: "https://wa.me/56947007007" },
    ],
    assets: {
      avatar: fitnessAvatar,
      banner: fitnessBanner,
      cardPalette: ["#123b55", "#18a3a7", "#b9f45f"],
    },
  },
  {
    id: "creator",
    label: "Creador",
    businessType: "creator",
    name: "Nube Estudio",
    profession: "Creadora digital y directora de arte",
    bio: "Ideas visuales, tutoriales y colaboraciones para marcas con personalidad.",
    primaryGoal: "social",
    personality: "energetic",
    primaryAction: {
      type: "instagram",
      value: "https://instagram.com/nubeestudio",
      label: "Ver contenido",
      description: "Descubre proyectos, procesos y nuevas colaboraciones.",
      cardCtaLabel: "Ver mi trabajo",
    },
    links: [
      {
        id: "proyectos",
        label: "Proyectos destacados",
        url: "https://example.com/nube-estudio/proyectos",
        platform: "website",
        description: "Dirección de arte, campañas y lanzamientos.",
      },
      {
        id: "tutoriales",
        label: "Tutoriales y recursos",
        url: "https://youtube.com/@nubeestudio",
        platform: "youtube",
        description: "Herramientas prácticas para crear mejor.",
      },
      {
        id: "colaboraciones",
        label: "Trabajemos juntos",
        url: "mailto:hola@nubeestudio.example",
        platform: "email",
        description: "Briefs, alianzas y propuestas de marca.",
      },
    ],
    socials: [
      { id: "instagram", platform: "instagram", url: "https://instagram.com/nubeestudio" },
      { id: "youtube", platform: "youtube", url: "https://youtube.com/@nubeestudio" },
      { id: "tiktok", platform: "tiktok", url: "https://tiktok.com/@nubeestudio" },
    ],
    assets: {
      avatar: creatorAvatar,
      banner: creatorBanner,
      cardPalette: ["#4a2382", "#ed5f9a", "#ffd35e"],
    },
  },
  {
    id: "local",
    label: "Tienda local",
    businessType: "local",
    name: "Casa Luma",
    profession: "Tienda local de diseño",
    bio: "Objetos útiles, decoración y regalos de autor seleccionados en el barrio.",
    primaryGoal: "sell",
    personality: "modern",
    primaryAction: {
      type: "website",
      value: "https://example.com/casa-luma/catalogo",
      label: "Ver catálogo",
      description: "Explora novedades, piezas limitadas y regalos.",
      cardCtaLabel: "Visitar",
    },
    links: [
      {
        id: "novedades",
        label: "Novedades de la semana",
        url: "https://example.com/casa-luma/novedades",
        platform: "website",
        description: "Nuevos objetos y pequeñas colecciones.",
      },
      {
        id: "regalos",
        label: "Guía de regalos",
        url: "https://instagram.com/casaluma",
        platform: "instagram",
        description: "Ideas para distintas personas y ocasiones.",
      },
      {
        id: "visita",
        label: "Visita la tienda",
        url: "https://example.com/casa-luma/visita",
        platform: "website",
        description: "Dirección, horarios y retiro en local.",
      },
    ],
    socials: [
      { id: "instagram", platform: "instagram", url: "https://instagram.com/casaluma" },
      { id: "whatsapp", platform: "whatsapp", url: "https://wa.me/56949009009" },
    ],
    assets: {
      avatar: localAvatar,
      banner: localBanner,
      cardPalette: ["#164b4a", "#db8f5a", "#f4c267"],
    },
  },
] as const;

export const ENGINE_LAB_FIXTURES = FIXTURES;

export function getEngineLabFixture(id: string): EngineLabBusinessFixture {
  return FIXTURES.find((fixture) => fixture.id === id) ?? FIXTURES[2]!;
}

export function draftFromFixture(fixture: EngineLabBusinessFixture): EngineLabDraft {
  return {
    fixtureId: fixture.id,
    businessType: fixture.businessType,
    name: fixture.name,
    profession: fixture.profession,
    bio: fixture.bio,
    primaryGoal: fixture.primaryGoal,
    personality: fixture.personality,
    actionType: fixture.primaryAction.type,
    actionValue: fixture.primaryAction.value,
    primaryActionLabel: fixture.primaryAction.label,
    lockPrimaryCta: false,
    hasAvatar: true,
    hasBanner: true,
    hasCardMedia: true,
  };
}

function cardArtwork(fixture: EngineLabBusinessFixture, title: string, index: number): string {
  const [dark, mid, light] = fixture.assets.cardPalette;
  const safeTitle = title.replace(/[<>&"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset=".62" stop-color="${mid}"/><stop offset="1" stop-color="${light}"/></linearGradient></defs><rect width="720" height="420" fill="url(#g)"/><circle cx="${index === 0 ? 585 : 125}" cy="${index === 0 ? 95 : 330}" r="190" fill="#fff" opacity=".1"/><path d="M-30 ${index === 0 ? 360 : 105}C180 ${index === 0 ? 230 : 235} 360 ${index === 0 ? 470 : 20} 760 ${index === 0 ? 250 : 190}" fill="none" stroke="#fff" stroke-width="28" opacity=".18"/><rect x="48" y="48" width="92" height="8" rx="4" fill="#fff" opacity=".74"/><text x="48" y="330" fill="#fff" font-family="Arial, sans-serif" font-size="38" font-weight="700">${safeTitle.slice(0, 28)}</text><text x="48" y="372" fill="#fff" font-family="Arial, sans-serif" font-size="19" opacity=".72">${fixture.name}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function intentFromFixtureDraft(
  fixture: EngineLabBusinessFixture,
  draft: EngineLabDraft,
  generatedAt: string,
): OnboardingIntentV1 {
  return {
    business_type: draft.businessType,
    business_other: draft.businessType === "other" ? draft.profession : null,
    primary_goal: draft.primaryGoal,
    visual_personality: draft.personality,
    identity: {
      name: draft.name,
      profession: draft.profession,
      bio: draft.bio,
      avatar_preview: draft.hasAvatar ? fixture.assets.avatar : null,
      banner_preview: draft.hasBanner ? fixture.assets.banner : null,
    },
    assets: { card_media: draft.hasCardMedia },
    primary_action: { type: draft.actionType, value: draft.actionValue },
    meta: { version: "1", completed_at: generatedAt },
  };
}

export function adapterContentFromFixtureDraft(
  fixture: EngineLabBusinessFixture,
  draft: EngineLabDraft,
): BasicEditorAdapterContentV1 {
  const links = fixture.links.map((link, index) => ({
    ...link,
    cardCtaLabel: fixture.primaryAction.cardCtaLabel,
    ...(draft.hasCardMedia && index < 2
      ? { imageUrl: cardArtwork(fixture, link.label, index) }
      : {}),
  }));
  return {
    links,
    socials: fixture.socials,
    footerText: `${draft.name} · ${draft.profession}`,
    primaryAction: {
      label: draft.primaryActionLabel.trim() || "Más información",
      description: fixture.primaryAction.description,
      cardCtaLabel: fixture.primaryAction.cardCtaLabel,
      locked: draft.lockPrimaryCta,
    },
  };
}

export function fixtureAssetSet(
  fixture: EngineLabBusinessFixture,
  draft: EngineLabDraft,
): readonly string[] {
  const content = adapterContentFromFixtureDraft(fixture, draft);
  return [
    ...(draft.hasAvatar ? [fixture.assets.avatar] : []),
    ...(draft.hasBanner ? [fixture.assets.banner] : []),
    ...content.links.flatMap((link) => (link.imageUrl ? [link.imageUrl] : [])),
  ];
}
