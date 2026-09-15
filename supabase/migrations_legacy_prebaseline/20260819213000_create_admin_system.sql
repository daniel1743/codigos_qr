-- Create admin system tables
-- Manages admin users, premium users, and invitation codes

-- ============================================================
-- 1. ADMIN USERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Insert super admin inicial
INSERT INTO admin_users (user_id, email, role)
SELECT id, 'falcondaniel37@gmail.com', 'super_admin'
FROM auth.users
WHERE email = 'falcondaniel37@gmail.com'
ON CONFLICT (email) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- ============================================================
-- 2. PREMIUM USERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS premium_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  tier TEXT DEFAULT 'premium' CHECK (tier IN ('premium', 'premium_pro')),

  -- Origin of premium access
  source TEXT DEFAULT 'admin_grant' CHECK (source IN ('admin_grant', 'invitation', 'purchase')),
  granted_by UUID REFERENCES auth.users(id),
  invitation_code TEXT,

  -- Temporal
  expires_at TIMESTAMPTZ, -- NULL = permanent
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_premium_users_user_id ON premium_users(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_users_email ON premium_users(email);
CREATE INDEX IF NOT EXISTS idx_premium_users_expires_at ON premium_users(expires_at);

-- ============================================================
-- 3. INVITATION CODES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- Format: 'PREMIUM-XXXX-XXXX'

  -- Configuration
  max_uses INT DEFAULT 1 CHECK (max_uses > 0),
  current_uses INT DEFAULT 0,
  tier TEXT DEFAULT 'premium' CHECK (tier IN ('premium', 'premium_pro')),
  duration_days INT, -- NULL = permanent

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Code expiration
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_is_active ON invitation_codes(is_active);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- Admin users policies
CREATE POLICY "Super admin can read all admin users"
ON admin_users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = auth.uid() AND a.role = 'super_admin'
  )
);

CREATE POLICY "Super admin can insert admin users"
ON admin_users FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = auth.uid() AND a.role = 'super_admin'
  )
);

-- Premium users policies
CREATE POLICY "Admin can read all premium users"
ON premium_users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
  )
);

CREATE POLICY "User can read own premium status"
ON premium_users FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admin can insert premium users"
ON premium_users FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
  )
);

CREATE POLICY "Admin can update premium users"
ON premium_users FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
  )
);

CREATE POLICY "Admin can delete premium users"
ON premium_users FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
  )
);

-- Invitation codes policies
CREATE POLICY "Admin can read all invitation codes"
ON invitation_codes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can read active codes for validation"
ON invitation_codes FOR SELECT
USING (is_active = true);

CREATE POLICY "Admin can insert invitation codes"
ON invitation_codes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
  )
);

CREATE POLICY "Admin can update invitation codes"
ON invitation_codes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
  )
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to generate invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := 'PREMIUM-' ||
              UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' ||
              UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

    SELECT EXISTS(SELECT 1 FROM invitation_codes WHERE code = v_code) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_code;
END;
$$;

-- Function to redeem invitation code
CREATE OR REPLACE FUNCTION redeem_invitation_code(
  p_code TEXT,
  p_user_id UUID,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation invitation_codes%ROWTYPE;
  v_expires_at TIMESTAMPTZ;
  v_premium_id UUID;
BEGIN
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
  IF EXISTS(SELECT 1 FROM premium_users WHERE user_id = p_user_id) THEN
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
    p_user_id,
    p_email,
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

-- Comments
COMMENT ON TABLE admin_users IS 'System administrators with access to admin panel';
COMMENT ON TABLE premium_users IS 'Users with Premium access';
COMMENT ON TABLE invitation_codes IS 'Invitation codes to grant Premium access';
COMMENT ON FUNCTION generate_invitation_code IS 'Generate a unique invitation code';
COMMENT ON FUNCTION redeem_invitation_code IS 'Redeem an invitation code to grant Premium access';
