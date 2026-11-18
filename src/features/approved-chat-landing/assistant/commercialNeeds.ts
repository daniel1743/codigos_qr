import type { AgentResponse, BusinessContext, ChatOption } from "../types/cripqer";

/**
 * High-risk commercial intents where a model can confuse a WhatsApp contact
 * request with a native booking/payment feature. These routes are deliberately
 * deterministic and short: they protect verified product facts and avoid an
 * unnecessary paid model call.
 */
export type CommercialNeedRoute =
  | "whatsapp_contact"
  | "whatsapp_orders"
  | "native_booking_limit";

export const GALLERY_AVAILABILITY_TEXT =
  "Puedes seguir viendo diseños de ejemplo para comparar estilos; los datos se adaptan a tu negocio. La aplicación directa de una plantilla se realiza desde la opción de personalización, mientras que aquí puedo ayudarte a definir tu página, tus servicios y tu contacto.";

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function showOptions(...options: ChatOption[]): AgentResponse["actions"] {
  return [{ type: "SHOW_OPTIONS", options }];
}

const DESIGN_OPTIONS = showOptions(
  { label: "Ver diseños", message: "Muéstrame diseños" },
  { label: "Crear mi página", message: "Quiero crear mi página" },
);

/**
 * Distinguishes "receive requests through WhatsApp" from "manage bookings in
 * an integrated calendar". The former is confirmed; the latter is not part of
 * the audited Cripqer base.
 */
export function detectCommercialNeed(input: string): CommercialNeedRoute | null {
  const value = normalize(input);
  const mentionsWhatsApp = /whatsapp|wsp|wasap|whats\b/.test(value);
  const mentionsOrder = /pedido|pedidos|orden|comprar|compra|vender|venta|encargo/.test(value);
  const mentionsBooking = /reserva|reservas|reservar|cita|turno|agendar|agenda|calendario|disponibilidad/.test(value);
  const requestsNativeFlow =
    /calendario|disponibilidad|agenda automat|confirmacion automat|confirmar automaticamente|pago|cobro|checkout|procesar pagos?|cobrar online/.test(value);

  if (requestsNativeFlow && mentionsBooking) return "native_booking_limit";
  if (mentionsWhatsApp && mentionsOrder) return "whatsapp_orders";
  if (mentionsWhatsApp && mentionsBooking) return "whatsapp_contact";
  if (mentionsWhatsApp && /contact|escrib|mensaje|cliente|consulta|atencion/.test(value)) {
    return "whatsapp_contact";
  }
  return null;
}

export function isInformationalCommercialQuestion(input: string): boolean {
  const route = detectCommercialNeed(input);
  if (!route) return false;
  return !/crear|creame|créame|hazmela|generala|aplicar|usar.*plantilla|abrir.*editor/.test(normalize(input));
}

export function isGalleryAvailabilityQuestion(input: string): boolean {
  const value = normalize(input);
  return /galeria|plantillas?|disenos?|diseños?/.test(value) &&
    /bloque|cerrad|disponib|aplicar|elegir|usar|seleccion|permiso/.test(value);
}

export function logCommercialNeedRoute(route: CommercialNeedRoute): void {
  console.info("[landing-assistant] intent route", {
    intent: route,
    route,
    toolRequired: false,
    modelCallSkipped: true,
  });
}

export function buildCommercialNeedResponse(
  route: CommercialNeedRoute,
  context: BusinessContext,
): AgentResponse {
  const business = context.businessIdentity.type === "hair_salon"
    ? "tu peluquería"
    : context.businessIdentity.type
      ? "tu negocio"
      : "tu actividad";

  switch (route) {
    case "whatsapp_contact":
      return {
        text: `Sí: Cripqer puede ayudarte a recibir solicitudes de reserva por WhatsApp. Puedes presentar ${business}, tus servicios y el siguiente paso en una página clara, con un botón visible para que la persona te escriba y coordine contigo; en una peluquería, por ejemplo, puedes destacar cortes, color y peinados. Esto no es un calendario automático ni confirma disponibilidad: es un canal directo de contacto que ya puedes usar.`,
        actions: DESIGN_OPTIONS,
      };
    case "whatsapp_orders":
      return {
        text: `Para recibir pedidos por WhatsApp, Cripqer puede reunir tus productos o servicios, explicar qué ofreces y dejar un botón directo para que el cliente te escriba desde la página o el QR. La página facilita el contacto y la solicitud del pedido; no afirmaré que incluye cobro online o checkout integrado porque eso no está confirmado en la base actual.`,
        actions: DESIGN_OPTIONS,
      };
    case "native_booking_limit":
      return {
        text: "Un calendario con disponibilidad, confirmaciones automáticas o pagos es distinto de recibir solicitudes por WhatsApp y no está confirmado como función nativa de la base actual de Cripqer. Lo que sí puedes hacer es presentar tus servicios, añadir un botón de WhatsApp o reunir un enlace externo de reservas ya existente para que el visitante encuentre el siguiente paso sin buscarlo entre tus redes.",
        actions: showOptions(
          { label: "Ver alternativas", message: "¿Cómo puedo recibir contactos sin calendario?" },
          { label: "Ver diseños", message: "Muéstrame diseños" },
        ),
      };
  }
}
