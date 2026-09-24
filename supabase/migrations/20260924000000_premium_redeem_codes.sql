-- 1. Create a secure, authenticated wrapper for redeeming codes
CREATE OR REPLACE FUNCTION public.redeem_invitation_code_secure(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_invitation invitation_codes%ROWTYPE;
  v_expires_at TIMESTAMPTZ;
  v_premium_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_email := auth.jwt() ->> 'email';
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  -- Get invitation code
  SELECT * INTO v_invitation
  FROM invitation_codes
  WHERE code = p_code
  AND is_active = true
  FOR UPDATE;

  -- Validate code exists
  IF v_invitation.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido o inactivo');
  END IF;

  -- Validate not expired
  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código expirado');
  END IF;

  -- Validate max uses
  IF v_invitation.current_uses >= v_invitation.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código agotado');
  END IF;

  -- Check if user already has premium
  IF EXISTS(SELECT 1 FROM premium_users WHERE user_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya tienes acceso Premium');
  END IF;

  -- Calculate expiration
  IF v_invitation.duration_days IS NOT NULL THEN
    v_expires_at := NOW() + (v_invitation.duration_days || ' days')::INTERVAL;
  ELSE
    v_expires_at := NULL; -- Permanent
  END IF;

  -- Create premium user
  INSERT INTO premium_users (
    user_id,
    email,
    tier,
    source,
    invitation_code,
    expires_at
  )
  VALUES (
    v_user_id,
    v_email,
    v_invitation.tier,
    'invitation',
    p_code,
    v_expires_at
  )
  RETURNING id INTO v_premium_id;

  -- Increment code usage
  UPDATE invitation_codes
  SET current_uses = current_uses + 1
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'success', true,
    'premium_id', v_premium_id,
    'tier', v_invitation.tier,
    'expires_at', v_expires_at
  );
END;
$$;

GRANT ALL ON FUNCTION public.redeem_invitation_code_secure(text) TO authenticated;

-- 2. Insert exactly 10 real codes for this certification
-- We use a DO block to ensure idempotency so we don't insert them twice.
DO $$
DECLARE
  v_count integer;
BEGIN
  -- We'll check if our specific batch prefix exists
  SELECT count(*) INTO v_count FROM invitation_codes WHERE code LIKE 'CQ-LT-%' OR code LIKE 'CQ-1Y-%';
  
  IF v_count = 0 THEN
    -- Insert 5 lifetime codes
    INSERT INTO invitation_codes (code, max_uses, current_uses, tier, duration_days, is_active)
    VALUES
      ('CQ-LT-7X9K-M2P4-W8V1', 1, 0, 'premium', NULL, true),
      ('CQ-LT-F4N6-R3Y9-L5C2', 1, 0, 'premium', NULL, true),
      ('CQ-LT-B1H8-Q7T3-J6D9', 1, 0, 'premium', NULL, true),
      ('CQ-LT-P5M2-Z9W4-K8X7', 1, 0, 'premium', NULL, true),
      ('CQ-LT-V3C7-L1N5-R9F2', 1, 0, 'premium', NULL, true);

    -- Insert 5 one-year codes
    INSERT INTO invitation_codes (code, max_uses, current_uses, tier, duration_days, is_active)
    VALUES
      ('CQ-1Y-G8D4-T2Q6-H1B9', 1, 0, 'premium', 365, true),
      ('CQ-1Y-M9P3-X5K1-W7Z4', 1, 0, 'premium', 365, true),
      ('CQ-1Y-C2L8-F6R9-N4V3', 1, 0, 'premium', 365, true),
      ('CQ-1Y-Y1T7-J3H5-Q9B8', 1, 0, 'premium', 365, true),
      ('CQ-1Y-W6K4-Z8X2-P1M9', 1, 0, 'premium', 365, true);
  END IF;
END $$;
