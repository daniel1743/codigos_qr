/**
 * Soporte Cripqer — detección determinista de intención (PURO, sin React).
 *
 * Ningún bot de este repo usa tool calling: la señal la da un detector local
 * (mismo criterio que `CONTACT_INTENT_KEYWORDS` en LandingBot.tsx, pero extraído
 * aquí para poder testearlo y para manejar la negación).
 *
 * `detectTicketIntent` decide si OFRECER preparar un ticket. Es conservador a
 * propósito: ante duda no ofrece (el botón «Crear ticket de soporte» ya está
 * siempre visible en el chat).
 *
 * `detectSecuritySignal` solo puede ESCALAR: se aplica server-side al crear el
 * ticket, de modo que un reporte de seguridad no pueda degradarse eligiendo la
 * categoría «Otro» en el formulario.
 */

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Frases que indican que el usuario NO quiere un ticket (anulan la intención). */
const NEGATION_PHRASES = [
  "no quiero",
  "no necesito",
  "no hace falta",
  "no me hagas",
  "no me abras",
  "no me crees",
  "no me crees un ticket",
  "sin ticket",
  "no gracias",
  "para nada",
  "ya cree",
  "ya he creado",
  "ya envie",
  "ya he enviado",
  "ya tengo un ticket",
  "ya abri",
];

const TICKET_INTENT_PHRASES = [
  "ticket",
  "soporte humano",
  "persona real",
  "hablar con una persona",
  "hablar con alguien",
  "hablar con soporte",
  "contactar soporte",
  "contactar con soporte",
  "atencion al cliente",
  "reclamo",
  "reclamar",
  "queja",
  "poner una queja",
  "reportar",
  "reporte",
  "denunciar",
  "escalar",
  "abrir un caso",
  "crear un caso",
];

/** Señales de un problema de seguridad. Solo escalan categoría y prioridad. */
const SECURITY_SIGNALS = [
  "acceso no autorizado",
  "acceso indebido",
  "no autorizado",
  "accedio a mi cuenta",
  "accedieron a mi cuenta",
  "entraron a mi cuenta",
  "sin mi permiso",
  "me hackearon",
  "hackearon",
  "hackeado",
  "hackeo",
  "suplantacion",
  "suplantaron",
  "me robaron",
  "robo de datos",
  "robaron mi cuenta",
  "datos filtrados",
  "filtracion de datos",
  "brecha de seguridad",
  "fallo de seguridad",
  "problema de seguridad",
  "agujero de seguridad",
  "vulnerabilidad",
  "phishing",
  "estafa",
  "fraude",
  "cargo no reconocido",
  "cobro no reconocido",
  "pago no reconocido",
  "cambiaron mi contrasena",
  "contrasena filtrada",
  "accedieron a mi cuenta",
];

export function detectTicketIntent(text: string): boolean {
  const normalized = normalize(text).trim();
  if (!normalized) return false;
  if (NEGATION_PHRASES.some((phrase) => normalized.includes(phrase))) return false;
  return TICKET_INTENT_PHRASES.some((phrase) => normalized.includes(phrase));
}

export function detectSecuritySignal(text: string): boolean {
  const normalized = normalize(text).trim();
  if (!normalized) return false;
  return SECURITY_SIGNALS.some((signal) => normalized.includes(signal));
}
