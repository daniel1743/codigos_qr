import { detectSalesObjection } from "./salesObjections";

export const LANDING_VALUE_LINE =
  "Puedes empezar gratis: el nivel gratuito permite crear, editar y publicar una página base; las métricas básicas están disponibles cuando la analítica está habilitada, así que puedes medir el interés sin inventar un plan ni un precio.";

export type CommercialTopic =
  | "contacts"
  | "sales"
  | "appointments"
  | "professional"
  | "analytics"
  | "comparison"
  | "generic";

const COMMERCIAL_VALUE_LINES: Record<CommercialTopic, string> = {
  contacts:
    "Si buscas más contactos, una landing ordena tus enlaces y deja WhatsApp, redes y tu propuesta a un clic; así la persona entiende qué haces y sabe cómo escribirte.",
  sales:
    "Si quieres vender o recibir pedidos, una landing pone tus productos o servicios y el siguiente paso en un solo lugar; puedes compartirla desde tu perfil o QR y revisar las interacciones básicas.",
  appointments:
    "Si quieres recibir reservas o citas, una landing hace visible tu oferta y tu canal de contacto desde el primer vistazo, para que el visitante no tenga que buscar entre varias redes.",
  professional:
    "Si quieres proyectar más profesionalismo, una landing propia te permite presentar quién eres, qué haces y cómo contactarte con una imagen coherente y editable.",
  analytics:
    "La ventaja de una landing es que no solo reúne tus enlaces: también te permite revisar métricas básicas de visitas, escaneos o interacciones cuando están habilitadas para la página.",
  comparison:
    "La diferencia práctica está en el destino que quieres construir: Cripqer combina una página de perfil personalizable, contacto, QR editable y métricas básicas, con muchas funciones base disponibles gratis.",
  generic: LANDING_VALUE_LINE,
};

export const SALES_FALLBACK_TEXT =
  `Puedo ayudarte a crear una landing clara para tu negocio. ${LANDING_VALUE_LINE}`;

export function inferCommercialTopic(input: string): CommercialTopic {
  const value = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/linktree|lintri|beacons|competencia|diferencia|mejor que/.test(value)) return "comparison";
  if (/contact|whatsapp|mensaje|escrib|clientes|leads/.test(value)) return "contacts";
  if (/vend|venta|pedido|catalogo|producto|servicio/.test(value)) return "sales";
  if (/reserva|cita|agend|turno/.test(value)) return "appointments";
  if (/profesional|imagen|marca|credibilidad|confianza/.test(value)) return "professional";
  if (/metric|visita|escane|analitic|medir|estadistic/.test(value)) return "analytics";
  return "generic";
}

export function commercialValueLine(input = ""): string {
  return COMMERCIAL_VALUE_LINES[inferCommercialTopic(input)];
}

/**
 * Keeps a commercial value proposition present without forcing the same
 * sentence into every turn. The optional topic is the visitor's current
 * question, not model instructions.
 */
export function ensureLandingValue(text: string, topicInput = ""): string {
  const clean = text.trim();
  if (!clean) return SALES_FALLBACK_TEXT;
  // Objections need a response to the blocker, not another automatic value
  // line or registration nudge appended after the model's answer.
  if (detectSalesObjection(topicInput)) return clean;
  const line = commercialValueLine(topicInput);
  if (clean.includes(line)) return clean;

  if (topicInput) {
    const topic = inferCommercialTopic(topicInput);
    const topicEvidence: Record<CommercialTopic, RegExp> = {
      contacts: /contact|whatsapp|enlace|escrib|cliente/i,
      sales: /vend|pedido|producto|servicio|catalog/i,
      appointments: /reserva|cita|agend|turno|contact/i,
      professional: /profesional|marca|present|confian|personaliz/i,
      analytics: /metric|visita|escane|analitic|interacc/i,
      comparison: /cripqer|linktree|beacons|diferencia|p[aá]gina|qr/i,
      generic: /landing|p[aá]gina|perfil|enlace|cripqer/i,
    };
    if (topicEvidence[topic].test(clean)) return clean;
  }

  // Keep the old safe contract for callers that do not pass a topic.
  if (!topicInput) {
    const mentionsMetrics = /visita|m[eé]trica/i.test(clean);
    const mentionsFree = /gratis|gratuit|mayor[ií]a.*funciones|funciones.*mayor[ií]a/i.test(clean);
    if (mentionsMetrics && mentionsFree) return clean;
  }

  return `${clean}\n\n${line}`;
}
