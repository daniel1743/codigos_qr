import { useCallback, useEffect, useState } from "react";
import { LifeBuoy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { updateSupportTicketFn, listSupportTicketsFn } from "./support-server";
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_CATEGORY_LABELS,
  SUPPORT_TICKET_PRIORITY_LABELS,
} from "../../../lib/support-assistant/ticket-taxonomy";
import {
  SUPPORT_TICKET_STATUS_LABELS,
  type SupportTicket,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from "./support-types";

/**
 * Soporte (F7/F8) — pestaña del Panel Admin.
 *
 * Lista tickets, muestra usuario/email/problema/resumen IA y permite cambiar
 * estado y prioridad, además de filtrar por estado y por categoría.
 * Autorización: RLS server-side + gate isUserAdmin en las server functions
 * (mismo patrón que el resto del panel). CRUD mínimo, sin CRM: sigue sin poder
 * responder en un hilo (pendiente documentado).
 */

const STATUS_VALUES: SupportTicketStatus[] = ["open", "in_progress", "resolved", "closed"];
const PRIORITY_VALUES: SupportTicketPriority[] = ["low", "normal", "high"];

const STATUS_BADGE_CLASS: Record<SupportTicketStatus, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const PRIORITY_BADGE_CLASS: Record<SupportTicketPriority, string> = {
  low: "bg-gray-100 text-gray-600",
  normal: "bg-sky-100 text-sky-700",
  high: "bg-red-100 text-red-700",
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("es", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

export function SupportPanel() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listSupportTicketsFn({ data: { statusFilter, categoryFilter } });
      setTickets(result.tickets);
    } catch (error) {
      console.error("Error loading support tickets:", error);
      toast.error("No se pudieron cargar los tickets.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const handlePatch = useCallback(
    async (
      ticketId: string,
      patch: { status?: SupportTicketStatus; priority?: SupportTicketPriority },
    ) => {
      try {
        await updateSupportTicketFn({ data: { ticketId, ...patch } });
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, ...patch } : t)));
        toast.success("Ticket actualizado.");
      } catch (error) {
        console.error("Error updating ticket:", error);
        toast.error("No se pudo actualizar el ticket.");
      }
    },
    [],
  );

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {STATUS_VALUES.map((status) => (
              <SelectItem key={status} value={status}>
                {SUPPORT_TICKET_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {SUPPORT_TICKET_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {SUPPORT_TICKET_CATEGORY_LABELS[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => void loadTickets()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <LifeBuoy className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              No hay tickets{" "}
              {statusFilter === "all" && categoryFilter === "all" ? "aún" : "con estos filtros"}
            </p>
            <p className="text-xs text-muted-foreground">
              Los tickets creados desde «Ayuda y soporte» aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const expanded = expandedId === ticket.id;
            return (
              <Card key={ticket.id}>
                <CardHeader
                  className="cursor-pointer py-4"
                  onClick={() => setExpandedId(expanded ? null : ticket.id)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-[14px]">{ticket.subject}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ticket.email || ticket.user_id} · {formatDate(ticket.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {SUPPORT_TICKET_CATEGORY_LABELS[ticket.category] ?? "Otro"}
                      </Badge>
                      <Badge className={PRIORITY_BADGE_CLASS[ticket.priority]}>
                        {SUPPORT_TICKET_PRIORITY_LABELS[ticket.priority]}
                      </Badge>
                      <Badge className={STATUS_BADGE_CLASS[ticket.status]}>
                        {SUPPORT_TICKET_STATUS_LABELS[ticket.status]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                {expanded && (
                  <CardContent className="space-y-3 border-t pt-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Problema
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{ticket.description}</p>
                    </div>
                    {ticket.ai_summary && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Resumen de la conversación
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{ticket.ai_summary}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Cambiar estado
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {STATUS_VALUES.map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={ticket.status === status ? "default" : "outline"}
                            onClick={() => void handlePatch(ticket.id, { status })}
                          >
                            {SUPPORT_TICKET_STATUS_LABELS[status]}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Prioridad
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {PRIORITY_VALUES.map((priority) => (
                          <Button
                            key={priority}
                            size="sm"
                            variant={ticket.priority === priority ? "default" : "outline"}
                            onClick={() => void handlePatch(ticket.id, { priority })}
                          >
                            {SUPPORT_TICKET_PRIORITY_LABELS[priority]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SupportPanel;
