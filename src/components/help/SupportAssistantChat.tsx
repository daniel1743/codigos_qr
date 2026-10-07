import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, MessageCircle, Send, Ticket, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { CqPanel } from "../cq-ui/CqPanel";
import { cqPrimaryButton, cqSecondaryButton } from "../cq-ui/buttonStyles";
import {
  SUPPORT_ASSISTANT_GREETING,
  SUPPORT_MAX_MESSAGE_LENGTH,
  SUPPORT_TICKET_DESCRIPTION_MAX_LENGTH,
  SUPPORT_TICKET_SUBJECT_MAX_LENGTH,
} from "../../lib/support-assistant/contract";
import { detectTicketIntent } from "../../lib/support-assistant/intent";
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_CATEGORY_LABELS,
  SUPPORT_TICKET_PRIORITY_LABELS,
  derivePriorityFromCategory,
  type SupportTicketCategory,
} from "../../lib/support-assistant/ticket-taxonomy";
import {
  askSupportAssistantFn,
  createSupportTicketFn,
  draftSupportTicketFn,
} from "../../lib/support-assistant/server";

/**
 * Asistente de ayuda (F2) — ventana de chat en /help.
 *
 * El navegador SOLO invoca server functions (askSupportAssistantFn /
 * draftSupportTicketFn / createSupportTicketFn); nunca DeepSeek.
 *
 * El asistente NO crea tickets: cuando detecta que la persona quiere uno
 * ofrece prepararlo (aviso de un clic, nunca un formulario que salta solo),
 * redacta asunto/descripción y la persona los revisa, elige categoría y pulsa
 * «Confirmar y enviar».
 *
 * Estados visibles: idle / loading / error / proveedor no disponible.
 * Sin respuestas simuladas: si el server falla, se muestra el error.
 */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type ChatState = "idle" | "loading" | "error";

type TicketSource = "model" | "fallback" | null;

export function SupportAssistantChat({ onTicketCreated }: { onTicketCreated?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: SUPPORT_ASSISTANT_GREETING },
  ]);
  const [input, setInput] = useState("");
  const [state, setState] = useState<ChatState>("idle");
  const [unavailable, setUnavailable] = useState(false);
  const [ticketFormOpen, setTicketFormOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketCategory, setTicketCategory] = useState<SupportTicketCategory>("other");
  const [ticketSource, setTicketSource] = useState<TicketSource>(null);
  const [drafting, setDrafting] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [clientRequestId, setClientRequestId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, state]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || state === "loading") return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setState("loading");
    setUnavailable(false);

    try {
      // Solo la conversación real (sin el saludo inicial de bienvenida).
      const conversation = nextMessages.slice(1);
      const response = await askSupportAssistantFn({
        data: { messages: conversation },
      });
      setMessages((prev) => [...prev, { role: "assistant", content: response.reply }]);
      if (response.unavailable) setUnavailable(true);
      setState("idle");
    } catch {
      setState("error");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "No pude responder en este momento. Intenta de nuevo o prepara un ticket de soporte.",
        },
      ]);
    }
  }, [input, messages, state]);

  const openTicketForm = useCallback(
    async (withDraft: boolean) => {
      setClientRequestId(crypto.randomUUID());
      setTicketFormOpen(true);
      if (!withDraft) return;

      setDrafting(true);
      setTicketSource(null);
      try {
        const result = await draftSupportTicketFn({ data: { messages: messages.slice(1) } });
        if (result.status === "rate_limited") {
          toast.error("Demasiadas peticiones seguidas. Espera un minuto e inténtalo de nuevo.");
          return;
        }
        setTicketSubject(result.draft.subject);
        setTicketDescription(result.draft.description);
        setTicketCategory(result.draft.category);
        setTicketSource(result.source);
      } catch {
        toast.error("No pude preparar el borrador. Puedes escribirlo tú.");
      } finally {
        setDrafting(false);
      }
    },
    [messages],
  );

  const handleCreateTicket = useCallback(async () => {
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;
    setCreatingTicket(true);
    try {
      const aiSummary = messages
        .slice(-6)
        .map((m) => `${m.role === "user" ? "Usuario" : "Asistente"}: ${m.content}`)
        .join(" | ")
        .slice(0, 1000);

      const result = await createSupportTicketFn({
        data: {
          subject: ticketSubject.trim(),
          description: ticketDescription.trim(),
          aiSummary,
          category: ticketCategory,
          clientRequestId: clientRequestId ?? undefined,
          conversation: messages.slice(1),
          confirmed: true, // Confirmación explícita del usuario (F6).
        },
      });

      if (result.status === "rate_limited") {
        toast.error("Demasiados tickets seguidos. Espera un minuto antes de crear otro.");
        return;
      }

      // Copy honesto: no hay email de confirmación, así que no se promete.
      toast.success(
        `Ticket #${result.ticketId.slice(0, 8)} creado. Puedes seguirlo en «Mis tickets».`,
      );
      setTicketFormOpen(false);
      setTicketSubject("");
      setTicketDescription("");
      setTicketSource(null);
      onTicketCreated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el ticket.";
      toast.error(message);
    } finally {
      setCreatingTicket(false);
    }
  }, [
    ticketSubject,
    ticketDescription,
    ticketCategory,
    clientRequestId,
    messages,
    onTicketCreated,
  ]);

  const lastUserMessage =
    [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const offerDraft =
    !ticketFormOpen &&
    !drafting &&
    state !== "loading" &&
    detectTicketIntent(lastUserMessage) &&
    messages.length > 1;

  const derivedPriority = derivePriorityFromCategory(ticketCategory);

  return (
    <CqPanel
      headingId="support-assistant-heading"
      title="Asistente de ayuda"
      description="Pregunta sobre tu página, tu QR o tu cuenta. Si no puedo resolverlo, podrás crear un ticket."
    >
      <div className="space-y-3">
        {/* Historial */}
        <div
          ref={scrollRef}
          className="max-h-80 min-h-40 space-y-2.5 overflow-y-auto rounded-cq-md bg-cq-canvas p-3"
          aria-live="polite"
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-cq-md px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                  message.role === "user"
                    ? "bg-cq-blue text-white"
                    : "bg-white text-cq-ink ring-1 ring-cq-line"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {state === "loading" && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-cq-md bg-white px-3.5 py-2.5 text-[13.5px] text-cq-muted ring-1 ring-cq-line">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Escribiendo…
              </div>
            </div>
          )}
        </div>

        {state === "error" && (
          <p className="flex items-center gap-1.5 text-[12.5px] text-red-600">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
            Hubo un error de conexión. Vuelve a intentar.
          </p>
        )}

        {/* Input + enviar */}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            maxLength={SUPPORT_MAX_MESSAGE_LENGTH}
            rows={2}
            placeholder="Escribe tu pregunta…"
            aria-label="Mensaje para el asistente"
            disabled={state === "loading"}
            className="min-h-11 w-full resize-none rounded-cq-sm border border-cq-line bg-white px-3 py-2.5 text-[13.5px] text-cq-ink placeholder:text-cq-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={state === "loading" || !input.trim()}
            className={`${cqPrimaryButton} min-h-11 w-11 shrink-0 px-0`}
            aria-label="Enviar mensaje"
          >
            {state === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>

        {/* Oferta del borrador — solo aparece si la persona pide un ticket */}
        {offerDraft && (
          <div className="flex flex-wrap items-center gap-3 rounded-cq-md border border-cq-blue-200 bg-cq-blue-50 p-3.5">
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-cq-ink">
              ¿Quieres que prepare el ticket con esta conversación?
            </p>
            <button
              type="button"
              onClick={() => void openTicketForm(true)}
              className={cqPrimaryButton}
            >
              <Wand2 className="h-4 w-4" aria-hidden />
              Preparar ticket
            </button>
          </div>
        )}

        {/* Escalar a ticket — acción del USUARIO, con confirmación */}
        {!ticketFormOpen ? (
          <button
            type="button"
            onClick={() => void openTicketForm(true)}
            className={cqSecondaryButton}
            disabled={drafting}
          >
            {drafting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Ticket className="h-4 w-4" aria-hidden />
            )}
            {drafting ? "Preparando…" : "Crear ticket de soporte"}
          </button>
        ) : (
          <div className="space-y-2.5 rounded-cq-md border border-cq-line bg-white p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[13.5px] font-semibold text-cq-ink">Crear ticket de soporte</p>
              <button
                type="button"
                onClick={() => setTicketFormOpen(false)}
                className={cqSecondaryButton.replace("min-h-11", "h-8 w-8 min-h-0 p-0")}
                aria-label="Cerrar formulario de ticket"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {drafting && (
              <p className="flex items-center gap-2 text-[12.5px] text-cq-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Preparando el borrador desde la conversación…
              </p>
            )}

            {ticketSource && !drafting && (
              <p className="text-[12.5px] leading-relaxed text-cq-muted">
                {ticketSource === "model"
                  ? "El asistente redactó este borrador. Revísalo y cámbialo si hace falta: el ticket no se envía hasta que lo confirmes."
                  : "El asistente no está disponible, así que el borrador se armó con tus mensajes. Revísalo antes de enviarlo."}
              </p>
            )}

            <p className="text-[12.5px] leading-relaxed text-cq-muted">
              Se enviará con el resumen de esta conversación para que soporte tenga contexto. No
              incluyas contraseñas ni datos sensibles.
            </p>

            <input
              type="text"
              value={ticketSubject}
              onChange={(event) => setTicketSubject(event.target.value)}
              maxLength={SUPPORT_TICKET_SUBJECT_MAX_LENGTH}
              placeholder="Asunto (p. ej. «No puedo publicar mi página»)"
              aria-label="Asunto del ticket"
              className="min-h-10 w-full rounded-cq-sm border border-cq-line bg-white px-3 text-[13.5px] text-cq-ink placeholder:text-cq-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue"
            />

            <textarea
              value={ticketDescription}
              onChange={(event) => setTicketDescription(event.target.value)}
              maxLength={SUPPORT_TICKET_DESCRIPTION_MAX_LENGTH}
              rows={4}
              placeholder="Describe el problema con detalle: qué hiciste, qué esperabas y qué pasó."
              aria-label="Descripción del ticket"
              className="w-full resize-none rounded-cq-sm border border-cq-line bg-white px-3 py-2.5 text-[13.5px] text-cq-ink placeholder:text-cq-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue"
            />

            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[12.5px] font-semibold text-cq-ink">
                  Categoría
                </span>
                <select
                  value={ticketCategory}
                  onChange={(event) =>
                    setTicketCategory(event.target.value as SupportTicketCategory)
                  }
                  aria-label="Categoría del ticket"
                  className="min-h-10 w-full rounded-cq-sm border border-cq-line bg-white px-3 text-[13.5px] text-cq-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue"
                >
                  {SUPPORT_TICKET_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {SUPPORT_TICKET_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className="mb-1 block text-[12.5px] font-semibold text-cq-ink">
                  Prioridad
                </span>
                <p className="flex min-h-10 items-center rounded-cq-sm bg-cq-canvas px-3 text-[13.5px] text-cq-muted">
                  {SUPPORT_TICKET_PRIORITY_LABELS[derivedPriority]}
                  {derivedPriority === "high" ? " (seguridad)" : ""}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleCreateTicket()}
              disabled={creatingTicket || !ticketSubject.trim() || !ticketDescription.trim()}
              className={cqPrimaryButton}
            >
              {creatingTicket ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Creando…
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Confirmar y enviar ticket
                </>
              )}
            </button>
          </div>
        )}

        {unavailable && (
          <p className="text-[12px] leading-relaxed text-cq-muted">
            El asistente automático está temporalmente no disponible. Puedes usar el buscador de
            arriba o crear un ticket.
          </p>
        )}
      </div>
    </CqPanel>
  );
}

export default SupportAssistantChat;
