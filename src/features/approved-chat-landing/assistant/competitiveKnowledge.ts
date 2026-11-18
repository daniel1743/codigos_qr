/**
 * Compact competitive intelligence for the sales assistant.
 *
 * The source research is intentionally not copied into the runtime prompt in
 * full: prices, review counts and plan limits change by region and date. This
 * file keeps the stable positioning facts and labels every strategic claim as
 * a fit-based recommendation, never as universal superiority.
 */
type CompetitiveProfile = {
  aliases: string[];
  positioning: string;
  strengths: string;
  tradeoff: string;
  cripqerFit: string;
};

const PROFILES: CompetitiveProfile[] = [
  {
    aliases: ["linktree", "lintri"],
    positioning: "link-in-bio de gran distribución: centraliza enlaces y ha ampliado su ecosistema con analítica, captura y monetización según el plan.",
    strengths: "marca conocida, rapidez para publicar y muchas integraciones para una audiencia amplia.",
    tradeoff: "la profundidad de diseño, analítica y monetización depende del plan y de la región.",
    cripqerFit: "Cripqer puede ser mejor decisión para un negocio hispano que necesita una presentación comercial más guiada, contacto/WhatsApp, QR editable y métricas básicas en un mismo destino.",
  },
  {
    aliases: ["beacons"],
    positioning: "suite para creadores que combina link-in-bio, tienda, media kit, email, audiencia, Smart Reply y herramientas de IA.",
    strengths: "bundling fuerte para creadores que venden productos digitales, colaboran con marcas o quieren reunir monetización y audiencia.",
    tradeoff: "su amplitud puede ser más de la necesaria para alguien que solo necesita una página comercial clara; plan, comisiones y límites cambian.",
    cripqerFit: "Cripqer puede ser mejor decisión si la prioridad es presentar un negocio, servicio o marca personal, llevar visitas desde redes/QR a un contacto claro y empezar con muchas funciones base gratuitas.",
  },
  {
    aliases: ["stan", "stan store"],
    positioning: "storefront para creadores: productos digitales, cursos, membresías, reservas, email, funnels y afiliados.",
    strengths: "flujo de monetización profundo cuando el creador ya vende productos o conocimiento.",
    tradeoff: "está orientado a monetizar una audiencia, no necesariamente a la presencia básica de un negocio local.",
    cripqerFit: "Cripqer puede ser mejor decisión para validar primero una presencia profesional, un CTA de contacto y un QR antes de necesitar una suite de venta avanzada.",
  },
  {
    aliases: ["taplink"],
    positioning: "micrositio/link-in-bio orientado a servicios, mensajería, comercio y captación.",
    strengths: "buena orientación a bloques comerciales y canales de contacto para negocios pequeños.",
    tradeoff: "las funciones de comercio, formularios, automatización y branding dependen del plan.",
    cripqerFit: "Cripqer puede ser mejor decisión para quien valore una creación guiada por objetivo, una identidad visual propia y un recorrido simple desde redes o QR hacia el contacto.",
  },
  {
    aliases: ["lnk.bio", "lnk bio", "lnkbio"],
    positioning: "link-in-bio económico, con enlaces, plantillas y muchos embeds.",
    strengths: "precio agresivo y profundidad para quien quiere muchos destinos con bajo coste.",
    tradeoff: "su propuesta se centra más en enlaces y personalización que en una guía comercial por tipo de negocio.",
    cripqerFit: "Cripqer puede ser mejor decisión si la persona quiere que la página explique su oferta y conduzca a una acción, no solo listar enlaces.",
  },
  {
    aliases: ["campsite", "campsite.bio"],
    positioning: "link-in-bio muy personalizable con analítica, formularios y opciones de equipo.",
    strengths: "customización y profundidad de analítica/organización para perfiles y equipos.",
    tradeoff: "el valor de sus planes aparece cuando se necesitan analítica histórica, captación o colaboración.",
    cripqerFit: "Cripqer puede ser mejor decisión para empezar con una página comercial sencilla, contacto y QR sin convertir el primer paso en una configuración de equipo.",
  },
  {
    aliases: ["milkshake"],
    positioning: "constructor visual mobile-first basado en tarjetas y storytelling.",
    strengths: "experiencia visual simple para creadores que quieren presentar contenido desde el móvil.",
    tradeoff: "su foco visual no equivale necesariamente a un flujo de negocio con QR, contacto y métricas orientadas a conversión.",
    cripqerFit: "Cripqer puede ser mejor decisión si la prioridad es una página comercial que conecte redes, propuesta, contacto y distribución por QR.",
  },
  {
    aliases: ["carrd"],
    positioning: "constructor generalista de sitios one-page, flexible y de bajo coste.",
    strengths: "libertad de composición y buena relación valor/precio para quien sabe diseñar una página.",
    tradeoff: "requiere más decisiones de construcción y no está centrado específicamente en onboarding comercial, WhatsApp o QR.",
    cripqerFit: "Cripqer puede ser mejor decisión para alguien que quiere publicar una presencia comercial guiada sin empezar desde un lienzo en blanco.",
  },
  {
    aliases: ["later", "later link in bio"],
    positioning: "suite de gestión social donde el link-in-bio convive con programación, contenido y analítica social.",
    strengths: "equipos y marcas que necesitan coordinar publicaciones y medir actividad social.",
    tradeoff: "puede ser más plataforma de marketing social de la necesaria para una página individual.",
    cripqerFit: "Cripqer puede ser mejor decisión si la necesidad inmediata es publicar una página comercial clara con un QR y un canal de contacto.",
  },
  {
    aliases: ["bio sites", "biosites", "unfold"],
    positioning: "perfiles visuales y mobile-first centrados en identidad, contenido social y publicación simple.",
    strengths: "onboarding visual y facilidad para comenzar con una página de perfil.",
    tradeoff: "la profundidad de comercio, atribución y flujo comercial puede variar frente a suites especializadas.",
    cripqerFit: "Cripqer puede ser mejor decisión si además de verse bien la página debe orientar a contactos, QR y métricas básicas.",
  },
];

// A brand mention alone is not a comparison. "¿Qué hace Cripqer?" needs
// product knowledge only; competitive profiles are paid context reserved for
// an explicit alternative, comparison, or differentiation question.
const COMPARISON_CUES = /linktree|lintri|beacons|stan(?:\s+store)?|taplink|lnk\.?\s*bio|campsite|milkshake|carrd|later(?:\s+link\s+in\s+bio)?|bio\s*sites?|biosites|unfold|competencia|alternativa|compar|mejor que|diferencia/i;

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function findProfiles(question: string): CompetitiveProfile[] {
  const normalized = normalize(question);
  return PROFILES.filter((profile) => profile.aliases.some((alias) => normalized.includes(normalize(alias))));
}

/** Returns an empty string for ordinary product questions, avoiding paid calls' extra context. */
export function competitiveKnowledgeForQuestion(question: string): string {
  if (!COMPARISON_CUES.test(question)) return "";
  const profiles = findProfiles(question);
  const selected = profiles.length > 0 ? profiles : PROFILES.slice(0, 4);
  const lines = selected.map((profile) => [
    `PLATAFORMA: ${profile.aliases[0]}`,
    `Propósito: ${profile.positioning}`,
    `Fortaleza: ${profile.strengths}`,
    `Matiz: ${profile.tradeoff}`,
    `Encaje Cripqer: ${profile.cripqerFit}`,
  ].join("\n"));

  return [
    "=== INTELIGENCIA COMPETITIVA SELECTIVA ===",
    "Usa estos hechos para responder con respeto. No cites precios exactos, porcentajes, usuarios, reseñas ni planes como si fueran permanentes: la investigación advierte variaciones regionales y temporales.",
    "Reconoce una ventaja real de la alternativa cuando corresponda. Después formula la recomendación por encaje: 'Si tu prioridad es X, Cripqer puede ser una mejor decisión porque Y'. Nunca afirmes superioridad universal.",
    ...lines,
    "Posicionamiento estratégico de Cripqer: página comercial + QR + WhatsApp/redes + métricas básicas para pequeños negocios hispanos. Esta es una hipótesis de posicionamiento que debe presentarse como encaje recomendado, no como hecho de mercado probado.",
    "=== FIN DE INTELIGENCIA COMPETITIVA ===",
  ].join("\n\n").slice(0, 5200);
}

