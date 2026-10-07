import "@tanstack/react-start/server-only";
import OpenAI from "openai";
import {
  SUPPORT_ASSISTANT_GREETING,
  SUPPORT_DRAFT_SYSTEM_PROMPT,
  SUPPORT_MAX_CONVERSATION_MESSAGES,
  SUPPORT_MAX_MESSAGE_LENGTH,
  SUPPORT_SYSTEM_CONTRACT,
  SUPPORT_TICKET_DESCRIPTION_MAX_LENGTH,
  SUPPORT_TICKET_SUBJECT_MAX_LENGTH,
} from "./contract";
import { buildKnowledgeContext } from "./knowledge.server";
import { createBillingServerSupabaseClient } from "../../server/billing/auth";
import { createRateLimiter } from "../landing-bot/rate-limit";
import { resolveTicketCategory } from "./ticket-rules";
import {
  buildFallbackDraft,
  parseJsonLoose,
  validateTicketDraft,
  type SupportTicketDraft,
} from "./draft-guardrails";

/**
 * Soporte Cripqer — motor del Asistente de ayuda (F3).
 *
 * Solo server-side: la DEEPSEEK_API_KEY se lee de process.env aquí y JAMÁS
 * llega al bundle del navegador (el cliente solo invoca server functions).
 * Patrón verbatim de `landing-bot/core.server.ts` y `fuxion-assistant`
 * (SDK OpenAI + baseURL DeepSeek) — sin acoplarse a ninguno de los dos.
 *
 * Sin FALLBACK_API_KEY en soporte: si el proveedor no está configurado, la
 * server fn responde con un error claro y el chat muestra el estado "no
 * disponible" — sin respuestas simuladas. El BORRADOR de ticket es la excepción
 * deliberada: si el modelo no está, se degrada a un borrador determinista
 * construido desde la conversación, para que el formulario nunca llegue vacío.
 */

export interface SupportConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SupportAssistantResult {
  reply: string;
  /** true cuando el proveedor de IA no está configurado (estado visible). */
  unavailable?: boolean;
}

// Burst protection por usuario. Utilidad compartida con landing-bot
// (`createRateLimiter`), que ya usan los otros bots — ver fuxion-assistant.
const chatRateLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
const draftRateLimiter = createRateLimiter({ windowMs: 60_000, max: 4 });
const createRateLimiter_ = createRateLimiter({ windowMs: 60_000, max: 3 });

function createDeepSeekClient(): OpenAI | null {
  const deepseekKey = process.env["DEEPSEEK_API_KEY"]?.trim();
  if (!deepseekKey) return null;
  return new OpenAI({
    baseURL: process.env["DEEPSEEK_BASE_URL"]?.trim() || "https://api.deepseek.com",
    apiKey: deepseekKey,
    maxRetries: 0,
    timeout: 15_000,
  });
}

/** USER CONTEXT mínimo: solo el email (la app no guarda más PII útil para soporte). */
export function buildUserContext(email: string | null): string {
  const lines = ["CONTEXTO DEL USUARIO:"];
  lines.push(`- Email de la cuenta: ${email ?? "(no disponible)"}`);
  return lines.join("\n");
}

/**
 * Normaliza la conversación que llega del navegador (input no confiable).
 * Exportado: lo comparten el chat, el borrador y la creación del ticket.
 */
export function normalizeConversation(input: unknown): SupportConversationMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(-SUPPORT_MAX_CONVERSATION_MESSAGES)
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const { role, content } = raw as { role?: unknown; content?: unknown };
      if (typeof content !== "string" || !content.trim()) return null;
      return {
        role: role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: content.slice(0, SUPPORT_MAX_MESSAGE_LENGTH),
      };
    })
    .filter((m): m is SupportConversationMessage => m !== null);
}

export async function answerSupportAssistant(
  userId: string,
  email: string | null,
  conversation: unknown,
): Promise<SupportAssistantResult> {
  const messages = normalizeConversation(conversation);
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    return { reply: SUPPORT_ASSISTANT_GREETING };
  }

  if (!chatRateLimiter.check(userId)) {
    return {
      reply:
        "Estoy recibiendo muchas consultas en este momento. Espera un minuto e intenta de nuevo, o crea un ticket de soporte.",
    };
  }

  const client = createDeepSeekClient();
  if (!client) {
    // Sin proveedor configurado: estado honesto, no simulación.
    return {
      unavailable: true,
      reply:
        "El asistente automático no está disponible en este momento. Puedes usar el buscador de esta página o crear un ticket de soporte y te responderemos lo antes posible.",
    };
  }

  const chatMessages = [
    { role: "system" as const, content: SUPPORT_SYSTEM_CONTRACT },
    { role: "system" as const, content: buildKnowledgeContext() },
    { role: "system" as const, content: buildUserContext(email) },
    ...messages,
  ];

  try {
    const completion = await client.chat.completions.create({
      model: process.env["DEEPSEEK_MODEL"]?.trim() || "deepseek-chat",
      messages: chatMessages,
      temperature: 0.3,
      max_tokens: 500,
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) {
      return {
        reply:
          "No pude generar una respuesta. Intenta reformular tu pregunta o crea un ticket de soporte.",
      };
    }
    return { reply };
  } catch (error) {
    console.error("[support-assistant] Error llamando al proveedor de IA:", error);
    return {
      reply:
        "Tuve un problema al procesar tu consulta. Intenta de nuevo en unos momentos o crea un ticket de soporte.",
    };
  }
}

// ── Borrador de ticket ────────────────────────────────────────────────
// El bot NO crea tickets: redacta un borrador que el usuario revisa y envía.
// Es una llamada aparte del chat porque una respuesta es texto libre y esta es
// JSON; fusionarlas rompería el formato de la conversación.

export type SupportDraftOutcome =
  | { status: "ok"; draft: SupportTicketDraft; source: "model" | "fallback" }
  | { status: "rate_limited" };

export async function draftSupportTicket(
  userId: string,
  conversation: unknown,
): Promise<SupportDraftOutcome> {
  const messages = normalizeConversation(conversation);
  const fallback = buildFallbackDraft(messages);

  if (!draftRateLimiter.check(userId)) {
    return { status: "rate_limited" };
  }

  const client = createDeepSeekClient();
  if (!client) {
    // Sin proveedor, el borrador determinista sigue siendo útil.
    return { status: "ok", draft: fallback, source: "fallback" };
  }

  try {
    const completion = await client.chat.completions.create({
      model: process.env["DEEPSEEK_MODEL"]?.trim() || "deepseek-chat",
      messages: [{ role: "system" as const, content: SUPPORT_DRAFT_SYSTEM_PROMPT }, ...messages],
      temperature: 0,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return { status: "ok", draft: fallback, source: "fallback" };

    const parsed = parseJsonLoose(text);
    if (!parsed) return { status: "ok", draft: fallback, source: "fallback" };

    const { draft } = validateTicketDraft(parsed, fallback);
    return { status: "ok", draft, source: "model" };
  } catch (error) {
    console.error("[support-assistant] Error generando el borrador:", error);
    return { status: "ok", draft: fallback, source: "fallback" };
  }
}

// ── Tickets de soporte ────────────────────────────────────────────────
// La tabla `support_tickets` se crea con una migration revisable (no aplicada).
// Este módulo usa el cliente anon con RLS (el usuario autenticado inserta su
// propio ticket); si la tabla no existe todavía, falla con error claro y el
// chat lo muestra — degradación honesta, sin simulación.

export interface SupportTicketDraftInput {
  subject: string;
  description: string;
  /** Categoría propuesta; el servidor la revalida y puede escalarla. */
  category: string;
  aiSummary: string;
  conversation: SupportConversationMessage[];
  /** Clave de idempotencia generada al abrir el formulario. */
  clientRequestId?: string | undefined;
}

export type CreateTicketOutcome =
  { status: "ok"; ticketId: string; deduplicated: boolean } | { status: "rate_limited" };

/** Idempotencia en proceso: reintentos y dobles clics devuelven el mismo ticket. */
const RECENT_TICKET_TTL_MS = 5 * 60_000;
const recentTicketRequests = new Map<string, { ticketId: string; at: number }>();

function findRecentTicket(key: string): string | null {
  const now = Date.now();
  for (const [storedKey, entry] of recentTicketRequests) {
    if (now - entry.at > RECENT_TICKET_TTL_MS) recentTicketRequests.delete(storedKey);
  }
  const entry = recentTicketRequests.get(key);
  if (!entry || now - entry.at > RECENT_TICKET_TTL_MS) return null;
  return entry.ticketId;
}

export async function createSupportTicket(
  userId: string,
  email: string | null,
  draft: SupportTicketDraftInput,
): Promise<CreateTicketOutcome> {
  const dedupeKey = draft.clientRequestId ? `${userId}:${draft.clientRequestId}` : null;
  if (dedupeKey) {
    const existing = findRecentTicket(dedupeKey);
    if (existing) return { status: "ok", ticketId: existing, deduplicated: true };
  }

  // El límite se comprueba después de la idempotencia: reintentar el mismo
  // envío no debe consumir cupo.
  if (!createRateLimiter_.check(userId)) {
    return { status: "rate_limited" };
  }

  const { category, priority } = resolveTicketCategory(draft);

  // Cliente cookie-bound del request actual: RLS evalúa al usuario autenticado
  // (solo puede insertar/leer SUS tickets). Nunca service_role aquí.
  const supabase = createBillingServerSupabaseClient();

  // Límites server-side (defensa en profundidad, el validador ya recortó).
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: userId,
      email: email ?? "",
      subject: draft.subject.slice(0, SUPPORT_TICKET_SUBJECT_MAX_LENGTH),
      description: draft.description.slice(0, SUPPORT_TICKET_DESCRIPTION_MAX_LENGTH),
      ai_summary: draft.aiSummary.slice(0, 1000),
      conversation: draft.conversation.slice(-SUPPORT_MAX_CONVERSATION_MESSAGES),
      category,
      status: "open",
      priority,
    })
    .select("id")
    .single();

  if (error) throw new Error(`No se pudo crear el ticket: ${error.message}`);

  const ticketId = data.id as string;
  if (dedupeKey) recentTicketRequests.set(dedupeKey, { ticketId, at: Date.now() });
  return { status: "ok", ticketId, deduplicated: false };
}
