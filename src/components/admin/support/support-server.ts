import { createServerFn } from "@tanstack/react-start";
import { isUserAdmin } from "../../../lib/admin-check";
import { createBillingServerSupabaseClient } from "../../../server/billing/auth";
import type { SupportTicket, SupportTicketPriority, SupportTicketStatus } from "./support-types";

/**
 * Soporte Cripqer — server functions de tickets (Panel Admin).
 *
 * Autorización: reutiliza el gate existente (isUserAdmin → admin_users), el
 * mismo que protege /admin. La protección real es RLS server-side con el
 * cliente cookie-bound del request (createBillingServerSupabaseClient).
 *
 * Todo va dentro de createServerFn: el navegador solo invoca el RPC; los
 * imports server-only quedan fuera del bundle cliente (import-protection).
 */

export interface AdminTicketListResult {
  tickets: SupportTicket[];
}

export const listSupportTicketsFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const { statusFilter, categoryFilter } = (input ?? {}) as {
      statusFilter?: unknown;
      categoryFilter?: unknown;
    };
    return {
      statusFilter: typeof statusFilter === "string" ? statusFilter : undefined,
      categoryFilter: typeof categoryFilter === "string" ? categoryFilter : undefined,
    };
  })
  .handler(async ({ data }): Promise<AdminTicketListResult> => {
    const supabase = createBillingServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sesión no válida.");
    if (!(await isUserAdmin(supabase, user.id))) {
      throw new Error("Sin permisos de administrador.");
    }

    let query = supabase
      .from("support_tickets")
      .select(
        "id, user_id, email, subject, description, ai_summary, conversation, category, status, priority, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (data.statusFilter && data.statusFilter !== "all") {
      query = query.eq("status", data.statusFilter);
    }
    if (data.categoryFilter && data.categoryFilter !== "all") {
      query = query.eq("category", data.categoryFilter);
    }

    const { data: tickets, error } = await query;
    if (error) throw new Error(error.message);
    return { tickets: (tickets ?? []) as SupportTicket[] };
  });

const TICKET_STATUSES: SupportTicketStatus[] = ["open", "in_progress", "resolved", "closed"];
const TICKET_PRIORITIES: SupportTicketPriority[] = ["low", "normal", "high"];

/**
 * Actualiza estado y/o prioridad. La migración ya declaraba que el admin
 * transiciona «estado/prioridad» (20261006120000_support_tickets_v1.sql), pero
 * el código solo cambiaba el estado: aquí se cierra esa diferencia.
 *
 * La prioridad se puede corregir a mano porque la derivación automática
 * (seguridad → alta) es una heurística, no una verdad.
 */
export const updateSupportTicketFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const { ticketId, status, priority } = (input ?? {}) as {
      ticketId?: unknown;
      status?: unknown;
      priority?: unknown;
    };
    if (typeof ticketId !== "string" || !ticketId) {
      throw new Error("Ticket inválido.");
    }

    const patch: { status?: SupportTicketStatus; priority?: SupportTicketPriority } = {};

    if (status !== undefined) {
      if (typeof status !== "string" || !TICKET_STATUSES.includes(status as SupportTicketStatus)) {
        throw new Error("Estado inválido.");
      }
      patch.status = status as SupportTicketStatus;
    }

    if (priority !== undefined) {
      if (
        typeof priority !== "string" ||
        !TICKET_PRIORITIES.includes(priority as SupportTicketPriority)
      ) {
        throw new Error("Prioridad inválida.");
      }
      patch.priority = priority as SupportTicketPriority;
    }

    if (!patch.status && !patch.priority) {
      throw new Error("No hay nada que actualizar.");
    }

    return { ticketId, patch };
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const supabase = createBillingServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sesión no válida.");
    if (!(await isUserAdmin(supabase, user.id))) {
      throw new Error("Sin permisos de administrador.");
    }

    const { error } = await supabase
      .from("support_tickets")
      .update(data.patch)
      .eq("id", data.ticketId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
