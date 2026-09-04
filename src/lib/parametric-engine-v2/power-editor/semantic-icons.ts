/**
 * Semantic icon policy for Engine V2.
 *
 * The Power Editor owns rendering and already resolves this small allowlist
 * through its existing Lucide-based SmartIcon maps. The Engine only chooses
 * a semantic name when the current renderer can consume it; unsupported
 * concepts intentionally return undefined.
 */

import type { FamilyId } from "../types";

export type SupportedSemanticIcon =
  | "whatsapp"
  | "phone"
  | "mail"
  | "calendar"
  | "globe"
  | "award"
  | "sparkles"
  | "clock"
  | "bookopen"
  | "arrowright";

function normalizedText(...values: (string | undefined)[]): string {
  return values.filter(Boolean).join(" ").toLowerCase();
}

/** Maps an action label/URL to a name already understood by the renderer. */
export function resolveSemanticActionIcon(input: {
  label?: string;
  url?: string;
}): SupportedSemanticIcon | undefined {
  const value = normalizedText(input.label, input.url);
  if (/whatsapp|wa\.me/.test(value)) return "whatsapp";
  if (/phone|tel:|llamar|llamada|telefono|teléfono/.test(value)) return "phone";
  if (/email|e-mail|mailto:|correo/.test(value)) return "mail";
  if (/booking|book|reserve|reserva|cita|agenda/.test(value)) return "calendar";
  if (/website|web|sitio|portfolio|portafolio|url/.test(value)) return "globe";
  if (/price|pricing|precio|tarifa|plan/.test(value)) return "award";
  if (/video|reel|watch|ver/.test(value)) return "arrowright";
  return undefined;
}

/**
 * Gives service items a restrained profession/family cue. Luxury and
 * editorial profiles deliberately receive only one cue to avoid icon-heavy
 * compositions; minimal profiles receive none.
 */
export function resolveProfessionIcon(
  profession: string,
  family: FamilyId,
  itemIndex: number,
): SupportedSemanticIcon | undefined {
  if (itemIndex > 0 && (family === "luxury" || family === "editorial")) return undefined;
  if (family === "minimal") return undefined;

  const value = profession.toLowerCase();
  if (/fitness|trainer|entren|gym|deporte/.test(value)) return "clock";
  if (/beauty|belleza|manicur|hair|pelu|barber|estet/.test(value)) return "sparkles";
  if (/creator|creador|filmmaker|audiovisual|video/.test(value)) return "arrowright";
  if (/consult|asesor|coach|professional|profesional/.test(value)) return "award";
  if (family === "luxury") return "sparkles";
  if (family === "energetic") return "clock";
  if (family === "corporate") return "award";
  if (family === "editorial") return "bookopen";
  return undefined;
}

/** Maps only proof labels with a clear existing Lucide renderer equivalent. */
export function resolveProofIcon(
  label: string,
  family: FamilyId,
  itemIndex: number,
): "BadgeCheck" | "Clock" | "Sparkles" | undefined {
  const value = label.toLowerCase();
  if (/verified|verific|coleg|certif|iso|trust|confianza/.test(value)) return "BadgeCheck";
  if (/24h|abierto|respuesta|rápida|rapida|clock|hora/.test(value)) return "Clock";
  if (family === "luxury" && itemIndex === 0) return "Sparkles";
  return undefined;
}
