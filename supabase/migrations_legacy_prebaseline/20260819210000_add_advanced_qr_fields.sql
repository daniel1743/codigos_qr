-- Add advanced QR styling fields to profiles table
-- This enables Premium features: gradients, custom dots, effects

ALTER TABLE public.profiles
  -- Advanced styling options (stored as JSONB for flexibility)
  ADD COLUMN IF NOT EXISTS qr_gradient JSONB, -- {type: 'linear'|'radial', colorStops: [...], rotation: 0-360}
  ADD COLUMN IF NOT EXISTS qr_dots_type varchar(30) DEFAULT 'square', -- 'square'|'rounded'|'dots'|'classy'|'extra-rounded'
  ADD COLUMN IF NOT EXISTS qr_corners_square_type varchar(30), -- 'square'|'extra-rounded'|'dot'
  ADD COLUMN IF NOT EXISTS qr_corners_dot_type varchar(30), -- 'square'|'dot'
  ADD COLUMN IF NOT EXISTS qr_effect varchar(20) DEFAULT 'none', -- 'none'|'neon'|'glow'

  -- Demo logo reference (Premium feature)
  ADD COLUMN IF NOT EXISTS qr_demo_logo_id UUID; -- Reference to demo_logos table (created in next migration)

-- Índice para búsquedas por demo logo
CREATE INDEX IF NOT EXISTS idx_profiles_demo_logo_id ON profiles(qr_demo_logo_id);

-- Comentarios para documentación
COMMENT ON COLUMN profiles.qr_gradient IS 'Advanced gradient configuration for Premium QR codes';
COMMENT ON COLUMN profiles.qr_dots_type IS 'Style of QR dots/modules (square, rounded, dots, classy, extra-rounded)';
COMMENT ON COLUMN profiles.qr_corners_square_type IS 'Style of corner squares';
COMMENT ON COLUMN profiles.qr_corners_dot_type IS 'Style of corner dots';
COMMENT ON COLUMN profiles.qr_effect IS 'Visual effect applied to QR (neon, glow)';
COMMENT ON COLUMN profiles.qr_demo_logo_id IS 'ID of demo logo if using Premium demo logos';
