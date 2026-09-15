-- Create demo_logos table for Premium feature
-- Logos internos editables que los usuarios Premium pueden elegir

CREATE TABLE IF NOT EXISTS demo_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'business', 'food', 'beauty', 'tech', 'creative'
  file_url TEXT NOT NULL, -- URL del logo en Supabase Storage
  preview_url TEXT NOT NULL, -- Thumbnail para preview rápido
  tier TEXT DEFAULT 'premium' CHECK (tier IN ('free', 'premium')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_demo_logos_category ON demo_logos(category);
CREATE INDEX IF NOT EXISTS idx_demo_logos_tier ON demo_logos(tier);

-- RLS: Todos pueden leer logos, solo admins pueden modificar
ALTER TABLE demo_logos ENABLE ROW LEVEL SECURITY;

-- Policy: Todos pueden ver logos (para preview)
CREATE POLICY "Anyone can read demo logos"
ON demo_logos FOR SELECT
USING (true);

-- Policy: Solo admin puede insertar logos
CREATE POLICY "Admin can insert demo logos"
ON demo_logos FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM admin_users WHERE role IN ('admin', 'super_admin')
  )
);

-- Policy: Solo admin puede actualizar logos
CREATE POLICY "Admin can update demo logos"
ON demo_logos FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM admin_users WHERE role IN ('admin', 'super_admin')
  )
);

-- Policy: Solo admin puede eliminar logos
CREATE POLICY "Admin can delete demo logos"
ON demo_logos FOR DELETE
USING (
  auth.uid() IN (
    SELECT user_id FROM admin_users WHERE role IN ('admin', 'super_admin')
  )
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_demo_logos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_demo_logos_updated_at ON demo_logos;
CREATE TRIGGER set_demo_logos_updated_at
BEFORE UPDATE ON demo_logos
FOR EACH ROW
EXECUTE FUNCTION update_demo_logos_updated_at();

-- Agregar foreign key constraint a profiles
-- (ya agregamos la columna en migración anterior)
ALTER TABLE profiles
ADD CONSTRAINT fk_profiles_demo_logo
FOREIGN KEY (qr_demo_logo_id) REFERENCES demo_logos(id) ON DELETE SET NULL;

-- Comentarios
COMMENT ON TABLE demo_logos IS 'Demo logos library for Premium QR codes';
COMMENT ON COLUMN demo_logos.category IS 'Logo category: business, food, beauty, tech, creative';
COMMENT ON COLUMN demo_logos.tier IS 'Access tier: free or premium';
