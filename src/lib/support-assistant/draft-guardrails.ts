/**
 * Soporte Cripqer — validación del borrador de ticket (PURO, testable).
 *
 * La salida del modelo es input NO confiable: DeepSeek garantiza la sintaxis
 * JSON, no el esquema. Aquí se valida campo a campo con allowlist y, cuando un
 * campo viene mal, se rellena desde un borrador determinista en vez de tirar
 * todo el borrador (el usuario siempre recibe un formulario usable).
 *
 * Mismo criterio que `parametric-engine-v2/ai/guardrails.ts`: parseo estricto,
 * luego tolerante, y allowlist explícita.
 */

import {
  SUPPORT_TICKET_DESCRIPTION_MAX_LENGTH,
  SUPPORT_TICKET_SUBJECT_MAX_LENGTH,
} from "./contract";
import { isSupportTicketCategory, type SupportTicketCategory } from "./ticket-taxonomy";

export interface SupportTicketDraft {
  subject: string;
  description: string;
  category: SupportTicketCategory;
}

export interface DraftValidationResult {
  draft: SupportTicketDraft;
  /** true si algún campo no pasó la validación y se usó el valor de respaldo. */
  usedFallback: boolean;
}

/**
 * Sustituye caracteres de control (el modelo puede colar saltos, tabs o bytes
 * raros). Se hace por punto de código y no con una regex: una clase que incluya
 * el rango de control dispara `no-control-regex` y aquí el criterio es explícito.
 */
function stripControlChars(value: string, replacement: string, keepNewlines: boolean): string {
  let out = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    const isControl = code < 32 || code === 127;
    if (!isControl || (keepNewlines && code === 10)) {
      out += char;
    } else {
      out += replacement;
    }
  }
  return out;
}

/** Colapsa espacios/saltos y quita controles (el asunto va en una sola línea). */
function collapseLine(value: string): string {
  return stripControlChars(value, " ", false).replace(/\s+/g, " ").trim();
}

/** Colapsa espacios repetidos pero conserva la estructura en párrafos. */
function tidyBlock(value: string): string {
  return stripControlChars(value, "", true)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Parseo tolerante: quita fences ```json, recorta del primer `{` al último `}`
 * y hace JSON.parse. Devuelve null si no hay objeto.
 */
export function parseJsonLoose(raw: string): unknown {
  const trimmed = raw.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const candidates = [unfenced, trimmed];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      /* probamos el siguiente */
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      /* sin JSON utilizable */
    }
  }
  return null;
}

/**
 * Borrador determinista desde la conversación: se usa cuando el modelo no está
 * configurado, falla o devuelve algo inutilizable. Nunca deja el formulario vacío.
 */
export function buildFallbackDraft(
  conversation: { role: "user" | "assistant"; content: string }[],
): SupportTicketDraft {
  const userMessages = conversation
    .filter((message) => message.role === "user")
    .map((message) => tidyBlock(message.content))
    .filter(Boolean);

  const description =
    userMessages.join("\n\n").slice(0, SUPPORT_TICKET_DESCRIPTION_MAX_LENGTH) ||
    "Solicitud de ayuda enviada desde el asistente de Cripqer.";
  const subject =
    collapseLine(userMessages[0] ?? "").slice(0, SUPPORT_TICKET_SUBJECT_MAX_LENGTH) ||
    "Solicitud de ayuda";

  return { subject, description, category: "other" };
}

/**
 * Valida el objeto devuelto por el modelo campo a campo. Un campo inválido cae
 * al valor del borrador de respaldo; no se descarta el borrador completo.
 */
export function validateTicketDraft(
  raw: unknown,
  fallback: SupportTicketDraft,
): DraftValidationResult {
  let usedFallback = false;
  const source = (raw ?? {}) as Record<string, unknown>;

  const candidateSubject =
    typeof source["subject"] === "string" ? collapseLine(source["subject"]) : "";
  let subject = fallback.subject;
  if (candidateSubject && candidateSubject.length <= SUPPORT_TICKET_SUBJECT_MAX_LENGTH) {
    subject = candidateSubject;
  } else {
    usedFallback = true;
  }

  const candidateDescription =
    typeof source["description"] === "string" ? tidyBlock(source["description"]) : "";
  let description = fallback.description;
  if (
    candidateDescription &&
    candidateDescription.length <= SUPPORT_TICKET_DESCRIPTION_MAX_LENGTH
  ) {
    description = candidateDescription;
  } else {
    usedFallback = true;
  }

  const candidateCategory = source["category"];
  let category = fallback.category;
  if (isSupportTicketCategory(candidateCategory)) {
    category = candidateCategory;
  } else {
    usedFallback = true;
  }

  return { draft: { subject, description, category }, usedFallback };
}
