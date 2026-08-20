-- Add per-corner QR colors and decorative frame style.
-- These fields are visual-only and keep the existing QR URL behavior unchanged.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS qr_corners_square_color varchar(7),
  ADD COLUMN IF NOT EXISTS qr_corners_dot_color varchar(7),
  ADD COLUMN IF NOT EXISTS qr_corner_top_left_color varchar(7),
  ADD COLUMN IF NOT EXISTS qr_corner_top_right_color varchar(7),
  ADD COLUMN IF NOT EXISTS qr_corner_bottom_left_color varchar(7),
  ADD COLUMN IF NOT EXISTS qr_frame_style varchar(30) DEFAULT 'plain';

COMMENT ON COLUMN profiles.qr_corners_square_color IS 'Default color for the three QR corner finder squares';
COMMENT ON COLUMN profiles.qr_corners_dot_color IS 'Default color for the inner QR corner dots';
COMMENT ON COLUMN profiles.qr_corner_top_left_color IS 'Top-left QR finder square custom color';
COMMENT ON COLUMN profiles.qr_corner_top_right_color IS 'Top-right QR finder square custom color';
COMMENT ON COLUMN profiles.qr_corner_bottom_left_color IS 'Bottom-left QR finder square custom color';
COMMENT ON COLUMN profiles.qr_frame_style IS 'Decorative QR frame style: plain, stamp, badge, phone, tag, bottle';
