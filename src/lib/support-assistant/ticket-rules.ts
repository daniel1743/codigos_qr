/**
 * Soporte Cripqer — reglas de creación del ticket (PURO, testable).
 *
 * Vive fuera de `core.server.ts` a propósito: ese módulo importa
 * `@tanstack/react-start/server-only` y no se puede cargar en un test unitario.
 * Aquí están las decisiones que sí queremos probar, en particular la escalada de
 * seguridad, que es la única que el usuario no puede desactivar desde el
 * formulario.
 */

import { detectSecuritySignal } from "./intent";
import {
  derivePriorityFromCategory,
  isSupportTicketCategory,
  type SupportTicketCategory,
  type SupportTicketPriority,
} from "./ticket-taxonomy";

export interface TicketCategoryInput {
  subject: string;
  description: string;
  /** Categoría propuesta por el cliente: puede ser inválida o ausente. */
  category: string;
  conversation: { role: "user" | "assistant"; content: string }[];
}

/**
 * Categoría y prioridad efectivas.
 *
 * - La categoría propuesta se filtra contra la allowlist (cualquier cosa rara
 *   cae a «other»).
 * - Si el texto contiene señales de seguridad, se ESCALA a `security` aunque el
 *   usuario haya elegido otra cosa: son las señales que más se intentan rebajar
 *   y las que más importa no perder.
 * - La prioridad se deriva siempre de la categoría efectiva; el cliente nunca
 *   la envía.
 */
export function resolveTicketCategory(input: TicketCategoryInput): {
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
} {
  const proposed: SupportTicketCategory = isSupportTicketCategory(input.category)
    ? input.category
    : "other";

  const haystack = [
    input.subject,
    input.description,
    ...input.conversation.filter((message) => message.role === "user").map((m) => m.content),
  ].join("\n");

  const category: SupportTicketCategory = detectSecuritySignal(haystack) ? "security" : proposed;
  return { category, priority: derivePriorityFromCategory(category) };
}
