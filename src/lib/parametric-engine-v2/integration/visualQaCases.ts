import type { OnboardingIntentV1 } from "../types";
import type { ContentSourceV2 } from "../power-editor/content-source";
import type { PlaygroundCase } from "../power-editor/playground-cases";

export interface VisualQaCase extends PlaygroundCase {
  qaGoal: string;
  qaStyle: string;
  qaComposition?: "media-hero";
}

const NOW = "2026-01-01T00:00:00.000Z";
const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=78`;
const AVATAR = image("photo-1544005313-94ddf0286df2");
const BANNER = image("photo-1497215728101-856f4ea42174");

function intent(
  businessType: string,
  primaryGoal: OnboardingIntentV1["primary_goal"],
  personality: OnboardingIntentV1["visual_personality"],
  name: string,
  profession: string,
  bio: string,
  action: OnboardingIntentV1["primary_action"],
  hasBanner = true,
  bannerUrl = BANNER,
): OnboardingIntentV1 {
  return {
    business_type: businessType,
    business_other: null,
    primary_goal: primaryGoal,
    visual_personality: personality,
    identity: {
      name,
      profession,
      bio,
      avatar_preview: AVATAR,
      banner_preview: hasBanner ? bannerUrl : null,
    },
    assets: { card_media: true },
    primary_action: action,
    meta: { version: "1", completed_at: NOW },
  };
}

const socialLinks = [
  { platform: "instagram", url: "https://instagram.com/cripqer" },
  { platform: "youtube", url: "https://youtube.com/@cripqer" },
  { platform: "linkedin", url: "https://linkedin.com/in/cripqer" },
];

const sixActions = [
  { label: "Reservar ahora", url: "https://example.com/reservar" },
  { label: "Ver servicios", url: "https://example.com/servicios" },
  { label: "Consultar precios", url: "https://example.com/precios" },
  { label: "Conocer el estudio", url: "https://example.com/estudio" },
  { label: "Leer opiniones", url: "https://example.com/opiniones" },
  { label: "Escribir por WhatsApp", url: "https://wa.me/34600000000" },
];

export const VISUAL_QA_CASES: VisualQaCase[] = [
  {
    id: "luxury-beauty",
    title: "Luxury Beauty",
    goalDescription: "Reserva de tratamientos premium con confianza y deseo.",
    qaGoal: "booking",
    qaStyle: "luxury elegant feminine",
    intent: intent(
      "beauty",
      "booking",
      "premium",
      "Amelia Rosé",
      "Directora de beauty atelier",
      "Tratamientos de autor, diagnóstico experto y una experiencia íntima.",
      { type: "booking", value: "https://cal.com/amelia" },
    ),
    content: {
      about: "Un espacio de belleza lenta para rituales precisos y resultados naturales.",
      badges: [{ label: "Atención privada" }, { label: "Agenda limitada" }],
      featured: {
        title: "El atelier",
        subtitle: "Conoce el espacio y la experiencia.",
        url: "https://example.com/atelier",
        imageUrl: image("photo-1515377905703-c4788e51af15"),
      },
      links: sixActions,
      socials: socialLinks,
      gallery: [
        { url: image("photo-1503602642458-232111445657"), alt: "Beauty editorial" },
        { url: image("photo-1487412720507-e7ab37603c6f"), alt: "Beauty portrait" },
        { url: image("photo-1512496015851-a90fb38ba796"), alt: "Beauty detail" },
      ],
      portfolio: [
        {
          label: "Editorial Rosé",
          description: "Dirección de belleza y color.",
          url: "https://example.com/editorial-rose",
          imageUrl: image("photo-1515886657613-9f3515b0c78f"),
        },
        {
          label: "Atelier skin",
          description: "Ritual de cuidado personalizado.",
          url: "https://example.com/atelier-skin",
          imageUrl: image("photo-1515377905703-c4788e51af15"),
        },
      ],
      video: { provider: "youtube", videoId: "ScMzIvxBSi4", title: "El ritual Signature" },
      mediaCard: {
        title: "Antes de tu visita",
        body: "Descubre cómo preparamos cada ritual.",
        imageUrl: image("photo-1526045478516-99145907023c"),
        url: "https://example.com/visita",
      },
      services: [
        {
          title: "Ritual facial Signature",
          description: "Diagnóstico y tratamiento personalizado.",
          price: "Desde 180 €",
        },
        {
          title: "Coloración de autor",
          description: "Tono, corte y acabado editorial.",
          price: "Desde 240 €",
        },
      ],
      testimonials: [
        {
          name: "Clara M.",
          quote: "Una experiencia impecable de principio a fin.",
          role: "Cliente",
          rating: 5,
        },
      ],
      pricing: [
        {
          title: "Primera visita",
          price: "180 €",
          period: "sesión",
          features: ["Diagnóstico", "Plan personalizado"],
        },
        {
          title: "Atelier mensual",
          price: "420 €",
          period: "mes",
          recommended: true,
          features: ["Dos sesiones", "Seguimiento directo"],
        },
      ],
      faq: [
        {
          question: "¿Cómo reservo?",
          answer: "Elige una hora disponible y recibirás confirmación inmediata.",
        },
      ],
      quickActions: [{ label: "WhatsApp", url: "https://wa.me/34600000000", icon: "whatsapp" }],
      bookingUrl: "https://cal.com/amelia",
    },
  },
  {
    id: "creator-premium",
    title: "Creator Premium",
    goalDescription: "Conversión social para una creadora visual multidisciplinar.",
    qaGoal: "social conversion",
    qaStyle: "creative visual modern",
    intent: intent(
      "creator",
      "social",
      "modern",
      "Luna Vale",
      "Directora creativa y filmmaker",
      "Historias visuales para marcas que quieren ser recordadas.",
      { type: "instagram", value: "https://instagram.com/lunavale" },
    ),
    content: {
      links: [
        {
          label: "Último proyecto",
          url: "https://example.com/proyecto",
          imageUrl: image("photo-1558655146-d09347e92766"),
          description: "Campaña de identidad y movimiento.",
        },
        {
          label: "Colaboraciones",
          url: "https://example.com/colaboraciones",
          imageUrl: image("photo-1541701494587-cb58502866ab"),
          description: "Trabajos seleccionados para marcas.",
        },
      ],
      socials: socialLinks,
      video: { provider: "youtube", videoId: "ScMzIvxBSi4", title: "Showreel 2026" },
      gallery: [
        { url: image("photo-1503602642458-232111445657"), alt: "Editorial visual" },
        { url: image("photo-1517840901100-8179e982acb7"), alt: "Retrato creativo" },
        { url: image("photo-1526779259212-939e64788e3c"), alt: "Dirección de arte" },
      ],
      portfolio: [
        {
          label: "Nocturne",
          description: "Film editorial",
          url: "https://example.com/nocturne",
          imageUrl: image("photo-1497366754035-f200968a6e72"),
        },
        {
          label: "Forma",
          description: "Brand system",
          url: "https://example.com/forma",
          imageUrl: image("photo-1559028012-481c04fa702d"),
        },
      ],
      qrUrl: "https://cripqer.com/lunavale",
    },
  },
  {
    id: "executive-consultant",
    title: "Executive Consultant",
    goalDescription: "Generación de leads cualificados para consultoría estratégica.",
    qaGoal: "lead generation",
    qaStyle: "corporate premium",
    intent: intent(
      "professional",
      "leads",
      "professional",
      "Mara Stein",
      "Consultora de transformación",
      "Ayudo a equipos ejecutivos a convertir complejidad en decisiones claras.",
      { type: "email", value: "hello@marastein.com" },
    ),
    content: {
      about: "Estrategia, operaciones y comunicación para compañías en su siguiente etapa.",
      badges: [{ label: "15 años" }, { label: "120 proyectos" }],
      links: [
        {
          label: "Casos de éxito",
          url: "https://example.com/casos",
          imageUrl: image("photo-1497366811353-6870744d04b2"),
          description: "Transformaciones con impacto medible.",
        },
        { label: "Metodología", url: "https://example.com/metodologia" },
        { label: "Dossier ejecutivo", url: "https://example.com/dossier" },
        { label: "Agendar conversación", url: "https://example.com/agendar" },
      ],
      contact: { email: "hello@marastein.com", phone: "+34 910 000 000" },
      document: {
        title: "Dossier ejecutivo",
        fileName: "marastein-dossier.pdf",
        fileSize: "2.4 MB",
        url: "https://example.com/dossier.pdf",
      },
      stats: [
        { value: "15", label: "Años de experiencia" },
        { value: "120+", label: "Proyectos" },
        { value: "4.9", label: "Valoración" },
      ],
      services: [
        { title: "Diagnóstico ejecutivo", description: "Una sesión para ordenar prioridades." },
        { title: "Acompañamiento", description: "Implementación con tu equipo." },
      ],
      testimonials: [
        {
          name: "S. Ortega",
          quote: "La claridad que necesitábamos para avanzar.",
          role: "CEO",
          rating: 5,
        },
      ],
      faq: [
        {
          question: "¿Trabajas con equipos internacionales?",
          answer: "Sí, en español e inglés, de forma presencial o remota.",
        },
      ],
      portfolio: [
        {
          label: "Growth reset",
          description: "Nuevo modelo operativo para una scale-up.",
          url: "https://example.com/growth-reset",
          imageUrl: image("photo-1556761175-b413da4baf72"),
        },
        {
          label: "Board narrative",
          description: "Claridad para decisiones de dirección.",
          url: "https://example.com/board-narrative",
          imageUrl: image("photo-1556761175-5973dc0f32e7"),
        },
      ],
    },
  },
  {
    id: "restaurant-premium",
    title: "Restaurant Premium",
    goalDescription: "Reservas directas para una experiencia gastronómica cálida.",
    qaGoal: "reservations",
    qaStyle: "warm elegant",
    intent: intent(
      "food",
      "booking",
      "elegant",
      "Casa Numa",
      "Cocina de temporada",
      "Producto local, fuego lento y una mesa para quedarse.",
      { type: "booking", value: "https://resy.com/casa-numa" },
      false,
    ),
    content: {
      badges: [{ label: "Abierto esta noche" }, { label: "Menú de temporada" }],
      links: [
        { label: "Reservar una mesa", url: "https://resy.com/casa-numa" },
        { label: "Ver el menú", url: "https://example.com/menu" },
      ],
      mediaCard: {
        title: "La experiencia Numa",
        body: "Un menú de ocho pases alrededor del producto local.",
        imageUrl: image("photo-1515003197210-e0cd71810b5f"),
        url: "https://example.com/experiencia",
      },
      gallery: [
        { url: image("photo-1414235077428-338989a2e8c0"), alt: "Mesa Numa" },
        { url: image("photo-1517248135467-4c7edcad34c4"), alt: "Sala Numa" },
      ],
      featured: {
        title: "La cocina abierta",
        subtitle: "Producto, fuego y temporada.",
        url: "https://example.com/cocina",
        imageUrl: image("photo-1515003197210-e0cd71810b5f"),
      },
      events: [
        {
          title: "Cena maridaje de otoño",
          date: "18 octubre",
          time: "20:30",
          location: "Casa Numa",
          ctaLabel: "Reservar",
          ctaUrl: "https://resy.com/casa-numa",
        },
      ],
      map: { label: "Calle del Prado 18, Madrid", lat: 40.4153, lng: -3.7016 },
      contact: { phone: "+34 910 000 000", address: "Calle del Prado 18, Madrid" },
      bookingUrl: "https://resy.com/casa-numa",
    },
  },
  {
    id: "fitness",
    title: "Fitness",
    goalDescription: "Conversión inmediata para entrenamiento y coaching.",
    qaGoal: "conversion",
    qaStyle: "energetic bold",
    intent: intent(
      "fitness",
      "sell",
      "energetic",
      "Atlas Performance",
      "Entrenamiento híbrido",
      "Fuerza, movilidad y energía para rendir mejor cada semana.",
      { type: "whatsapp", value: "+34600111222" },
    ),
    content: {
      badges: [{ label: "Primera sesión gratis" }, { label: "Online y presencial" }],
      links: sixActions,
      socials: socialLinks,
      services: [
        {
          title: "Plan fuerza",
          description: "Programa progresivo de 8 semanas.",
          price: "89 €/mes",
        },
        {
          title: "Coaching 1:1",
          description: "Seguimiento y ajustes semanales.",
          price: "149 €/mes",
        },
        {
          title: "Movilidad",
          description: "Sesiones cortas para moverte mejor.",
          price: "39 €/mes",
        },
      ],
      pricing: [
        {
          title: "Performance",
          price: "149 €",
          period: "mes",
          recommended: true,
          features: ["Plan personalizado", "Revisión semanal", "Comunidad privada"],
        },
      ],
      testimonials: [
        {
          name: "Diego R.",
          quote: "Entreno con intención y sin lesionarme.",
          role: "Atleta amateur",
          rating: 5,
        },
      ],
      gallery: [
        { url: image("photo-1534430480872-3498386e7856"), alt: "Entrenamiento de fuerza" },
        { url: image("photo-1517836357463-d25dfeac3438"), alt: "Entrenamiento personal" },
        { url: image("photo-1581009146145-b5ef050c2e1e"), alt: "Movimiento y movilidad" },
      ],
      portfolio: [
        {
          label: "Atlas method",
          description: "Programa híbrido de rendimiento.",
          url: "https://example.com/atlas-method",
          imageUrl: image("photo-1534438327276-14e5300c3a48"),
        },
        {
          label: "Performance lab",
          description: "Fuerza y movilidad aplicada.",
          url: "https://example.com/performance-lab",
          imageUrl: image("photo-1571019613454-1cb2f99b2d8b"),
        },
      ],
      video: { provider: "youtube", videoId: "ScMzIvxBSi4", title: "Atlas training session" },
      mediaCard: {
        title: "Empieza con una sesión",
        body: "Conoce tu punto de partida y tu siguiente nivel.",
        imageUrl: image("photo-1534438327276-14e5300c3a48"),
        url: "https://example.com/primera-sesion",
      },
      quickActions: [
        { label: "Entrenar ahora", url: "https://wa.me/34600111222", icon: "message-circle" },
      ],
      bookingUrl: "https://example.com/primera-sesion",
    },
  },
  {
    id: "minimal-professional",
    title: "Minimal Professional",
    goalDescription: "Contacto limpio y directo para una profesional independiente.",
    qaGoal: "contact",
    qaStyle: "clean minimal",
    intent: intent(
      "freelancer",
      "leads",
      "minimal",
      "Irene Costa",
      "Editora y estratega de contenidos",
      "Palabras precisas para productos, equipos y marcas con criterio.",
      { type: "email", value: "hola@irenecosta.com" },
      false,
    ),
    content: {
      about: "Trabajo con equipos pequeños que necesitan pensar, escribir y publicar mejor.",
      links: [
        { label: "Escribir por email", url: "mailto:hola@irenecosta.com" },
        { label: "Ver trabajos", url: "https://example.com/trabajos" },
        { label: "Sobre mi proceso", url: "https://example.com/proceso" },
        { label: "Descargar portfolio", url: "https://example.com/portfolio.pdf" },
      ],
      socials: [{ platform: "linkedin", url: "https://linkedin.com/in/irenecosta" }],
      document: {
        title: "Portfolio 2026",
        fileName: "irene-costa-portfolio.pdf",
        fileSize: "1.2 MB",
        url: "https://example.com/portfolio.pdf",
      },
      contact: { email: "hola@irenecosta.com" },
    },
  },
  {
    id: "banner-manicurist",
    title: "Banner-first · Manicurist",
    goalDescription: "Caso de aceptación para banner visible y composición refinada.",
    qaGoal: "booking",
    qaStyle: "luxury",
    mediaStrategy: "banner-first",
    intent: intent(
      "beauty",
      "booking",
      "premium",
      "Nora Atelier",
      "Manicurista de autor",
      "Manicura editorial y cuidado preciso para ocasiones especiales.",
      { type: "booking", value: "https://cal.com/nora-atelier" },
      true,
      image("photo-1604654894610-df63bc536371"),
    ),
    content: {
      links: [
        { label: "Reservar cita", url: "https://cal.com/nora-atelier" },
        { label: "Ver tratamientos", url: "https://example.com/nora-tratamientos" },
      ],
      services: [
        { title: "Signature nails", description: "Diseño y cuidado personalizado." },
        { title: "Manicura editorial", description: "Acabado para sesiones y eventos." },
      ],
      quickActions: [{ label: "WhatsApp", url: "https://wa.me/34600000000" }],
    },
  },
  {
    id: "banner-gardener",
    title: "Banner-first · Gardener",
    goalDescription: "Caso de aceptación para fotografía natural y overlay bajo.",
    qaGoal: "conversion",
    qaStyle: "natural",
    mediaStrategy: "banner-first",
    intent: intent(
      "local",
      "whatsapp",
      "modern",
      "Mateo Verde",
      "Diseñador de jardines",
      "Jardines vivos, sostenibles y pensados para durar.",
      { type: "whatsapp", value: "+34600111222" },
      true,
      image("photo-1416879595882-3373a0480b5b"),
    ),
    content: {
      links: [
        { label: "Pedir presupuesto", url: "https://wa.me/34600111222" },
        { label: "Ver jardines", url: "https://example.com/mateo-verde" },
      ],
      gallery: [
        { url: image("photo-1416879595882-3373a0480b5b"), alt: "Jardín natural" },
        { url: image("photo-1558904541-efa843a96f01"), alt: "Paisajismo" },
      ],
    },
  },
  {
    id: "banner-barber",
    title: "Banner-first · Barber",
    goalDescription: "Caso de aceptación para tratamiento oscuro sin ocultar la imagen.",
    qaGoal: "booking",
    qaStyle: "dark-premium",
    mediaStrategy: "banner-first",
    intent: intent(
      "local",
      "booking",
      "premium",
      "Bruno Black",
      "Barbero clásico",
      "Cortes precisos, ritual de afeitado y estilo a medida.",
      { type: "booking", value: "https://cal.com/bruno-black" },
      true,
      image("photo-1503951914875-452162b0f3f1"),
    ),
    content: {
      links: [
        { label: "Reservar hora", url: "https://cal.com/bruno-black" },
        { label: "Servicios", url: "https://example.com/bruno-servicios" },
      ],
      mediaCard: {
        title: "El ritual",
        body: "Una pausa, un corte impecable.",
        imageUrl: image("photo-1503951914875-452162b0f3f1"),
      },
    },
  },
  {
    id: "immersive-creator",
    title: "Immersive · Creator",
    goalDescription: "Caso de aceptación para distinguir fondo inmersivo del banner tradicional.",
    qaGoal: "social",
    qaStyle: "creative elegant",
    mediaStrategy: "immersive-background",
    intent: intent(
      "creator",
      "social",
      "elegant",
      "Iris Vale",
      "Directora creativa",
      "Dirección visual para historias con una identidad inolvidable.",
      { type: "instagram", value: "https://instagram.com/irisvale" },
      true,
      image("photo-1497366754035-f200968a6e72"),
    ),
    content: {
      links: [
        { label: "Ver proyectos", url: "https://example.com/iris-proyectos" },
        { label: "Instagram", url: "https://instagram.com/irisvale" },
      ],
      gallery: [
        { url: image("photo-1558655146-d09347e92766"), alt: "Dirección visual" },
        { url: image("photo-1541701494587-cb58502866ab"), alt: "Identidad creativa" },
      ],
    },
  },
  {
    id: "minimal-typographic",
    title: "Minimal · Typographic top",
    goalDescription: "Caso de aceptación para verificar que no aparece un shell de banner vacío.",
    qaGoal: "leads",
    qaStyle: "clean minimal",
    mediaStrategy: "minimal-no-media",
    intent: intent(
      "professional",
      "leads",
      "minimal",
      "Clara Norte",
      "Consultora independiente",
      "Claridad estratégica para equipos que necesitan avanzar.",
      { type: "email", value: "hola@claranorte.com" },
      false,
    ),
    content: {
      links: [{ label: "Escribir por email", url: "mailto:hola@claranorte.com" }],
      contact: { email: "hola@claranorte.com" },
    },
  },
  {
    id: "media-hero-creator",
    title: "Media hero · Creator",
    goalDescription: "Caso explícito para verificar la silueta media-hero existente.",
    qaGoal: "conversion",
    qaStyle: "editorial-premium",
    qaComposition: "media-hero",
    mediaStrategy: "video-first",
    intent: intent(
      "creator",
      "sell",
      "modern",
      "Noah Frame",
      "Creator visual",
      "Historias de marca con dirección, ritmo y una mirada editorial.",
      { type: "website", value: "https://example.com/noah-frame" },
      true,
      image("photo-1497366754035-f200968a6e72"),
    ),
    content: {
      featured: {
        title: "Showreel editorial",
        subtitle: "Una selección de dirección visual y movimiento.",
        url: "https://example.com/noah-showreel",
        imageUrl: image("photo-1558655146-d09347e92766"),
      },
      video: { provider: "youtube", videoId: "ScMzIvxBSi4", title: "Noah Frame showreel" },
      links: [
        { label: "Ver el showreel", url: "https://example.com/noah-showreel" },
        { label: "Trabajar juntos", url: "https://example.com/noah-contact" },
      ],
    },
  },
];
