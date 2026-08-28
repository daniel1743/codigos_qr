-- Cripqer Power Editor generator audit V1.
-- REVIEW ONLY: apply manually after reviewing the preflight and rollback.
-- Creates only generator metadata/audit tables; no templates or projects are inserted.

BEGIN;

CREATE TABLE IF NOT EXISTS public.power_editor_template_blueprints (
  blueprint_key TEXT PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.power_editor_templates(id) ON DELETE CASCADE,
  content_fingerprint TEXT NOT NULL CHECK (char_length(content_fingerprint) = 64),
  category TEXT NOT NULL,
  archetype TEXT NOT NULL,
  generator_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.power_editor_template_generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generator_version TEXT NOT NULL,
  seed TEXT NOT NULL,
  template_count INTEGER NOT NULL CHECK (template_count > 0),
  audit JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_power_editor_template_blueprints_template_id
  ON public.power_editor_template_blueprints(template_id);
CREATE INDEX IF NOT EXISTS idx_power_editor_template_generation_runs_created_at
  ON public.power_editor_template_generation_runs(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.power_editor_template_blueprints'::regclass
      AND tgname = 'set_power_editor_template_blueprints_updated_at'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER set_power_editor_template_blueprints_updated_at
    BEFORE UPDATE ON public.power_editor_template_blueprints
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

ALTER TABLE public.power_editor_template_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_editor_template_generation_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.power_editor_template_blueprints FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.power_editor_template_generation_runs FROM PUBLIC, anon, authenticated;

-- The protected synchronizer is server-only and uses service_role.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.power_editor_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.power_editor_template_blueprints TO service_role;
GRANT SELECT, INSERT ON TABLE public.power_editor_template_generation_runs TO service_role;

COMMIT;
