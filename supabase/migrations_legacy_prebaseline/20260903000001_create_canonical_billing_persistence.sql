-- CRIPQER CANONICAL BILLING PERSISTENCE V1
-- Provider-neutral SaaS subscription storage. No provider SDK or payloads.

CREATE TABLE IF NOT EXISTS public.billing_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'mercado_pago', 'paypal')),
  provider_customer_id TEXT NOT NULL CHECK (length(btrim(provider_customer_id)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT billing_customers_provider_customer_unique UNIQUE (provider, provider_customer_id),
  CONSTRAINT billing_customers_user_provider_unique UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('pro', 'business', 'enterprise')),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'mercado_pago', 'paypal')),
  billing_customer_id UUID REFERENCES public.billing_customers(id) ON DELETE SET NULL,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  billing_interval TEXT CHECK (billing_interval IN ('monthly', 'yearly')),
  currency TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'past_due', 'paused', 'cancelled', 'expired')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_subscriptions_provider_subscription_unique
  ON public.billing_subscriptions (provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS billing_subscriptions_one_live_per_user_unique
  ON public.billing_subscriptions (user_id)
  WHERE status IN ('pending', 'active', 'past_due', 'paused');

CREATE INDEX IF NOT EXISTS billing_subscriptions_user_id_idx
  ON public.billing_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS billing_subscriptions_provider_customer_idx
  ON public.billing_subscriptions (provider, provider_customer_id)
  WHERE provider_customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.billing_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'mercado_pago', 'paypal')),
  plan_id TEXT NOT NULL CHECK (plan_id IN ('pro', 'business', 'enterprise')),
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
  provider_checkout_id TEXT,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'pending', 'success', 'failed', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_checkouts_provider_checkout_unique
  ON public.billing_checkouts (provider, provider_checkout_id)
  WHERE provider_checkout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS billing_checkouts_user_id_idx
  ON public.billing_checkouts (user_id);

CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'mercado_pago', 'paypal')),
  event_id TEXT NOT NULL CHECK (length(btrim(event_id)) > 0),
  status TEXT NOT NULL CHECK (status IN ('processing', 'processed', 'failed')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_code TEXT,
  diagnostic_reference TEXT,
  CONSTRAINT billing_events_provider_event_unique UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS billing_events_status_received_idx
  ON public.billing_events (status, received_at);

DROP TRIGGER IF EXISTS set_billing_customers_updated_at ON public.billing_customers;
CREATE TRIGGER set_billing_customers_updated_at
  BEFORE UPDATE ON public.billing_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_billing_subscriptions_updated_at ON public.billing_subscriptions;
CREATE TRIGGER set_billing_subscriptions_updated_at
  BEFORE UPDATE ON public.billing_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_billing_checkouts_updated_at ON public.billing_checkouts;
CREATE TRIGGER set_billing_checkouts_updated_at
  BEFORE UPDATE ON public.billing_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- No browser policies are created: authenticated and anonymous browser roles
-- have no direct billing access. Server-only service-role operations bypass RLS.
REVOKE ALL ON TABLE public.billing_customers FROM anon, authenticated;
REVOKE ALL ON TABLE public.billing_subscriptions FROM anon, authenticated;
REVOKE ALL ON TABLE public.billing_checkouts FROM anon, authenticated;
REVOKE ALL ON TABLE public.billing_events FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_checkouts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_events TO service_role;

-- Atomic provider-scoped idempotency claim. A duplicate processing/processed
-- event returns false; a failed event is deliberately claimable again.
CREATE OR REPLACE FUNCTION public.claim_billing_event(p_provider TEXT, p_event_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public
AS $$
  WITH inserted AS (
    INSERT INTO public.billing_events (provider, event_id, status)
    VALUES (p_provider, p_event_id, 'processing')
    ON CONFLICT (provider, event_id) DO UPDATE
      SET status = 'processing',
          received_at = NOW(),
          processed_at = NULL,
          error_code = NULL,
          diagnostic_reference = NULL
      WHERE billing_events.status = 'failed'
    RETURNING id
  )
  SELECT EXISTS (SELECT 1 FROM inserted);
$$;

REVOKE EXECUTE ON FUNCTION public.claim_billing_event(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_billing_event(TEXT, TEXT) TO service_role;
