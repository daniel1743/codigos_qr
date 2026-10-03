-- UF1_1: durable per public_id / month quota for the landing bot.
--
-- Additive and self-contained: a NEW table + a NEW function. It never touches
-- any existing table or function. If it is not applied, the server falls back
-- to an in-memory limiter (no breakage).

CREATE TABLE IF NOT EXISTS public.landing_bot_usage (
  public_id TEXT NOT NULL,
  period TEXT NOT NULL,          -- 'YYYY-MM'
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT landing_bot_usage_pkey PRIMARY KEY (public_id, period)
);

ALTER TABLE public.landing_bot_usage ENABLE ROW LEVEL SECURITY;
-- No RLS policies on purpose: the table is only reachable through the
-- SECURITY DEFINER function below, invoked server-side with the service role.

CREATE OR REPLACE FUNCTION public.consume_landing_bot_quota(
  p_public_id TEXT,
  p_period TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.landing_bot_usage (public_id, period, count, updated_at)
  VALUES (p_public_id, p_period, 1, now())
  ON CONFLICT (public_id, period)
  DO UPDATE SET count = public.landing_bot_usage.count + 1, updated_at = now()
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_landing_bot_quota(TEXT, TEXT) FROM PUBLIC;
