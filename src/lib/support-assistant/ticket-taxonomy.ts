/**
 * Soporte Cripqer — taxonomía del ticket (FUENTE ÚNICA).
 *
 * Módulo PURO y client-safe: lo consumen el formulario del chat, las server
 * functions y el panel admin. Vive en `lib` (y no en `components/admin/support`)
 * para que `lib` no tenga que importar de `components`.
 *
 * La categoría la sugiere el modelo y la confirma el usuario en el formulario,
 * pero el servidor SIEMPRE la revalida al crear el ticket — y puede escalarla a
 * `security` si detecta señales de seguridad (ver `intent.ts`).
 */

export type SupportTicketCategory = "billing" | "account" | "security" | "usage" | "other";
export type SupportTicketPriority = "low" | "normal" | "high";

export const SUPPORT_TICKET_CATEGORIES: SupportTicketCategory[] = [
  "billing",
  "account",
  "security",
  "usage",
  "other",
];

export const SUPPORT_TICKET_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  billing: "Pagos y facturación",
  account: "Mi cuenta",
  security: "Seguridad",
  usage: "Uso de la app",
  other: "Otro",
};

export const SUPPORT_TICKET_PRIORITY_LABELS: Record<SupportTicketPriority, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
};

export function isSupportTicketCategory(value: unknown): value is SupportTicketCategory {
  return (
    typeof value === "string" && SUPPORT_TICKET_CATEGORIES.includes(value as SupportTicketCategory)
  );
}

/**
 * Prioridad derivada de la categoría. Es una función pura a propósito: el
 * cliente nunca envía prioridad, así que un usuario no puede inflarla ni
 * rebajarla. Solo seguridad nace con prioridad alta.
 */
export function derivePriorityFromCategory(category: SupportTicketCategory): SupportTicketPriority {
  return category === "security" ? "high" : "normal";
}
