import { createServerFn } from "@tanstack/react-start";
import { createBillingServerSupabaseClient, getBillingUser } from "../../server/billing/auth";
import {
  answerSupportAssistant,
  createSupportTicket,
  draftSupportTicket,
  normalizeConversation,
  type SupportConversationMessage,
} from "./core.server";
import type { SupportTicketCategory, SupportTicketPriority } from "./ticket-taxonomy";
import type { SupportTicketDraft } from "./draft-guardrails";

/**
 * Soporte Cripqer — frontera HTTP del asistente (F3/F4/F5 tickets).
 *
 * El navegador SOLO habla con estas server functions; nunca con DeepSeek.
 * Autenticación: getBillingUser resuelve la identidad desde las cookies del
 * request (fail-closed). Rate limit y límites de tamaño se aplican server-side.
 *
 * El asistente NO crea tickets: `draftSupportTicketFn` redacta un borrador y
 * `createSupportTicketFn` exige la confirmación explícita del usuario.
 */

export interface SupportChatResponse {
  reply: string;
  unavailable?: boolean;
}

export type SupportDraftResponse =
  | { status: "ok"; draft: SupportTicketDraft; source: "model" | "fallback" }
  | { status: "rate_limited" };

export type SupportTicketResponse =
  { status: "ok"; ticketId: string; deduplicated: boolean } | { status: "rate_limited" };

/**
 * Preguntar al asistente. Requiere sesión (a diferencia del landing bot, este
 * asistente es solo para usuarios autenticados de la app).
 */
export const askSupportAssistantFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Solicitud inválida.");
    const { messages } = input as { messages?: unknown };
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Solicitud inválida.");
    }
    return { messages };
  })
  .handler(async ({ data }): Promise<SupportChatResponse> => {
    const billingUser = await getBillingUser();
    if (!billingUser) throw new Error("Sesión no válida.");

    return answerSupportAssistant(
      billingUser.userId,
      billingUser.email,
      data.messages as SupportConversationMessage[],
    );
  });

/**
 * Redactar el borrador del ticket a partir de la conversación.
 *
 * No escribe nada: devuelve asunto, descripción y categoría sugerida para que
 * el usuario los revise en el formulario. Si el proveedor de IA no está
 * disponible, devuelve el borrador determinista (source: "fallback").
 */
export const draftSupportTicketFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Solicitud inválida.");
    const { messages } = input as { messages?: unknown };
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Solicitud inválida.");
    }
    return { messages };
  })
  .handler(async ({ data }): Promise<SupportDraftResponse> => {
    const billingUser = await getBillingUser();
    if (!billingUser) throw new Error("Sesión no válida.");

    return draftSupportTicket(billingUser.userId, data.messages);
  });

const TICKET_CATEGORY_VALUES: SupportTicketCategory[] = [
  "billing",
  "account",
  "security",
  "usage",
  "other",
];

/**
 * Crear ticket de soporte. El cliente SIEMPRE envía la confirmación explícita
 * del usuario (confirmed: true); el asistente nunca crea tickets por sí solo.
 *
 * La categoría que llega se revalida en el motor (`resolveTicketCategory`), que
 * además puede escalarla a `security`. La prioridad no se acepta del cliente.
 */
export const createSupportTicketFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Solicitud inválida.");
    const { subject, description, aiSummary, conversation, category, clientRequestId, confirmed } =
      input as {
        subject?: unknown;
        description?: unknown;
        aiSummary?: unknown;
        conversation?: unknown;
        category?: unknown;
        clientRequestId?: unknown;
        confirmed?: unknown;
      };

    // Confirmación explícita obligatoria (F6): la IA no puede escalar sola.
    if (confirmed !== true) throw new Error("Se requiere confirmación del usuario.");

    if (typeof subject !== "string" || !subject.trim()) {
      throw new Error("El asunto es obligatorio.");
    }
    if (typeof description !== "string" || !description.trim()) {
      throw new Error("La descripción es obligatoria.");
    }

    return {
      subject: subject.trim(),
      description: description.trim(),
      aiSummary: typeof aiSummary === "string" ? aiSummary.slice(0, 1000) : "",
      // Si llega una categoría desconocida se manda "other" y el motor la
      // vuelve a filtrar: nunca se rechaza el ticket entero por esto.
      category:
        typeof category === "string" &&
        TICKET_CATEGORY_VALUES.includes(category as SupportTicketCategory)
          ? category
          : "other",
      clientRequestId:
        typeof clientRequestId === "string" && clientRequestId.trim()
          ? clientRequestId.trim().slice(0, 64)
          : undefined,
      conversation: normalizeConversation(conversation),
    };
  })
  .handler(async ({ data }): Promise<SupportTicketResponse> => {
    const billingUser = await getBillingUser();
    if (!billingUser) throw new Error("Sesión no válida.");

    return createSupportTicket(billingUser.userId, billingUser.email, {
      subject: data.subject,
      description: data.description,
      aiSummary: data.aiSummary,
      category: data.category,
      clientRequestId: data.clientRequestId,
      conversation: data.conversation,
    });
  });

// ── Mis tickets ───────────────────────────────────────────────────────
// El usuario puede ver los suyos (RLS: policy "Users can view own support
// tickets"). Sin esta vista el ticket entraba en un agujero negro: se enviaba y
// no había forma de volver a consultarlo.

export interface MySupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: SupportTicketPriority;
  category: SupportTicketCategory;
  created_at: string;
  updated_at: string;
}

export const listMySupportTicketsFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ tickets: MySupportTicket[] }> => {
    const billingUser = await getBillingUser();
    if (!billingUser) throw new Error("Sesión no válida.");

    const supabase = createBillingServerSupabaseClient();
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, subject, status, priority, category, created_at, updated_at")
      .eq("user_id", billingUser.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return { tickets: (data ?? []) as MySupportTicket[] };
  },
);
