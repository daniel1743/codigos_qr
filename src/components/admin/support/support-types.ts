/**
 * Soporte Cripqer — tipos compartidos (cliente/server/admin).
 *
 * La taxonomía (categorías, prioridades y sus etiquetas) vive en
 * `lib/support-assistant/ticket-taxonomy` y se re-exporta aquí: `lib` es la
 * fuente única porque también la usan el formulario del chat y las server
 * functions, y `lib` no debe depender de `components`.
 */
import type {
  SupportTicketCategory,
  SupportTicketPriority,
} from "../../../lib/support-assistant/ticket-taxonomy";

export type { SupportTicketCategory, SupportTicketPriority };

export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface SupportConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  email: string;
  subject: string;
  description: string;
  ai_summary: string;
  conversation: SupportConversationMessage[];
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  created_at: string;
  updated_at: string;
}

export const SUPPORT_TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: "Abierto",
  in_progress: "En progreso",
  resolved: "Resuelto",
  closed: "Cerrado",
};
