-- =============================================================================
-- SUPPORT_V1 — Tickets de soporte para el Asistente de ayuda de Cripqer.
--
-- ⚠️  MIGRACIÓN CREADA PERO NO APLICADA A PRODUCCIÓN (revisable).
--     Aplicar manualmente tras revisión: supabase db push / SQL editor.
--
-- Additive and self-contained: una tabla NUEVA. No toca tablas ni funciones
-- existentes. Si no está aplicada, la creación de tickets falla con error
-- visible en el chat; el resto de /help sigue funcionando.
--
-- Diseño:
--   * RLS habilitado. El usuario autenticado ve/crea SOLO sus tickets.
--   * Los admins (tabla admin_users) pueden ver y actualizar todos los tickets
--     vía policies subquery (mismo patrón que premium_users/demo_logos).
--   * NO se almacena razonamiento interno del modelo: solo la conversación
--     visible (user/assistant), el resumen de soporte y datos del usuario.
--   * Email: sin infraestructura de envío confirmada en el repo → la
--     confirmación al usuario queda EMAIL_PENDING (frontera documentada en
--     src/lib/support-assistant/server.ts). La columna `email_notified_at`
--     deja listo el marcado cuando exista el proveedor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL DEFAULT '',
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 150),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 4000),
  ai_summary text NOT NULL DEFAULT '',
  -- Conversación visible de la sesión (user/assistant), recortada server-side.
  conversation jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high')),
  email_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS support_tickets_created_at_idx ON public.support_tickets (created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- El usuario ve solo SUS tickets.
CREATE POLICY "Users can view own support tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

-- El usuario crea tickets solo a su propio nombre.
CREATE POLICY "Users can create own support tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- El usuario NO puede actualizar/borrar (transición de estado solo admin).

-- Lectura admin (mismo patrón subquery que las policies del baseline).
CREATE POLICY "Admins can view all support tickets"
  ON public.support_tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.user_id = auth.uid()
    )
  );

-- El admin solo transiciona el estado/prioridad; el resto no se toca aquí
-- (la UI de admin actualiza columnas acotadas).
CREATE POLICY "Admins can update support tickets"
  ON public.support_tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.user_id = auth.uid()
    )
  );

-- Trigger de updated_at (mismo patrón que demo_logos en el baseline).
CREATE OR REPLACE FUNCTION public.update_support_tickets_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_support_tickets_updated_at();
