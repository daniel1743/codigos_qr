ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS decor_shape text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS decor_particles text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS decor_smoke text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS decor_shadow text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS decor_intensity text DEFAULT 'subtle';
