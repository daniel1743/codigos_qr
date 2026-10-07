-- =============================================================================
-- SUPPORT_V2 — Categoría del ticket de soporte (Cripqer).
--
-- Aditiva sobre SUPPORT_V1 (20261006120000_support_tickets_v1.sql): añade la
-- columna `category` para poder clasificar y filtrar los tickets (pagos,
-- cuenta, seguridad, uso, otro) sin tocar las columnas ni las policies ya
-- definidas.
--
-- ⚠️  MIGRACIÓN CREADA PERO NO APLICADA A PRODUCCIÓN (revisable).
--     Aplicar manualmente tras revisión: supabase db push / SQL editor.
--     Requiere que la v1 esté aplicada ANTES (el timestamp la ordena delante).
--     Si la tabla todavía no existe, esta migración avisa por NOTICE y no falla.
--
-- Por qué v2 y no editar la v1: Supabase registra cada migración por su
-- versión de timestamp. Si la v1 ya se aplicó en algún entorno (QA/local),
-- editarla no la vuelve a ejecutar y la columna quedaría sin crear — un fallo
-- silencioso en el INSERT. Una migración nueva funciona en ambos escenarios.
--
-- Diseño:
--   * `text` + CHECK nombrado (mismo patrón que status/priority), no un enum
--     de Postgres: cambiar la lista de categorías es dropear el constraint.
--   * `NOT NULL DEFAULT 'other'`: los tickets que ya existan quedan en "other".
--   * La prioridad NO se guarda derivada aquí: se calcula server-side al crear
--     (la columna `priority` de la v1 admite low|normal|high).
--
-- Pendiente documentado (no resuelto aquí): no hay notificación por email
-- (`email_notified_at` sigue sin escribirse), el admin no puede responder en un
-- hilo, y el usuario no recibe aviso de cambios de estado.
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.support_tickets') IS NULL THEN
    RAISE NOTICE 'support_tickets no existe: aplica antes 20261006120000_support_tickets_v1.sql. Migración v2 omitida.';
    RETURN;
  END IF;

  ALTER TABLE public.support_tickets
    ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_category_check'
  ) THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_category_check
      CHECK (category IN ('billing', 'account', 'security', 'usage', 'other'));
  END IF;

  CREATE INDEX IF NOT EXISTS support_tickets_category_idx
    ON public.support_tickets (category);
END
$$;
