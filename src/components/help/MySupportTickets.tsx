import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { CqPanel } from "../cq-ui/CqPanel";
import { listMySupportTicketsFn, type MySupportTicket } from "../../lib/support-assistant/server";
import {
  SUPPORT_TICKET_CATEGORY_LABELS,
  SUPPORT_TICKET_PRIORITY_LABELS,
  isSupportTicketCategory,
  type SupportTicketCategory,
} from "../../lib/support-assistant/ticket-taxonomy";

/**
 * «Mis tickets» (F5) — seguimiento de los tickets propios en /help.
 *
 * Cierra el circuito del ticket: antes se enviaba y no había forma de volver a
 * consultarlo. La RLS ya permitía al usuario leer los suyos; esto solo lo hace
 * visible. Segunda lectura, sin hilo de conversación (el admin todavía no puede
 * responder).
 */

const STATUS_LABELS: Record<string, string> = {
  open: "Abierto",
  in_progress: "En progreso",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const STATUS_CLASS: Record<string, string> = {
  open: "bg-cq-blue-50 text-cq-blue",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-cq-canvas text-cq-muted",
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" }).format(
        date,
      );
}

function categoryLabel(value: unknown): string {
  return isSupportTicketCategory(value)
    ? SUPPORT_TICKET_CATEGORY_LABELS[value as SupportTicketCategory]
    : "Otro";
}

export function MySupportTickets({ refreshToken }: { refreshToken: number }) {
  const [tickets, setTickets] = useState<MySupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listMySupportTicketsFn()
      .then((result) => {
        if (!active) return;
        setTickets(result.tickets);
        setFailed(false);
      })
      .catch(() => {
        // El usuario no puede arreglar esto y no bloquea nada: se informa sin
        // alarmar y sin inventar que hay cero tickets.
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshToken]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-[12.5px] text-cq-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Cargando tus tickets…
      </p>
    );
  }

  if (failed) {
    return (
      <p className="text-[12.5px] leading-relaxed text-cq-muted">
        No pudimos cargar tus tickets en este momento. Vuelve a intentarlo más tarde.
      </p>
    );
  }

  if (tickets.length === 0) return null;

  return (
    <CqPanel
      headingId="my-tickets-heading"
      title="Mis tickets"
      description="Los tickets que has enviado desde el asistente, con su estado actual."
    >
      <ul className="divide-y divide-cq-line">
        {tickets.map((ticket) => (
          <li
            key={ticket.id}
            className="flex flex-wrap items-start gap-3 py-3.5 first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-cq-ink">{ticket.subject}</p>
              <p className="mt-0.5 text-[12px] text-cq-muted">
                #{ticket.id.slice(0, 8)} · {categoryLabel(ticket.category)} · Prioridad{" "}
                {SUPPORT_TICKET_PRIORITY_LABELS[ticket.priority] ?? ticket.priority} ·{" "}
                {formatDate(ticket.created_at)}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                STATUS_CLASS[ticket.status] ?? "bg-cq-canvas text-cq-muted"
              }`}
            >
              {STATUS_LABELS[ticket.status] ?? ticket.status}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] leading-relaxed text-cq-muted">
        Todavía no enviamos avisos por correo cuando cambia el estado: consúltalo aquí.
      </p>
    </CqPanel>
  );
}

export default MySupportTickets;
