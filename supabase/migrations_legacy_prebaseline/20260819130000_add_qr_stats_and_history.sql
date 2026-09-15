-- Agregar contador de aperturas agregado a profiles
ALTER TABLE profiles 
ADD COLUMN scan_count INT NOT NULL DEFAULT 0;

-- Tabla muy ligera para el historial visual (no son campañas nuevas)
CREATE TABLE qr_visual_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    foreground_color TEXT DEFAULT '#000000',
    background_color TEXT DEFAULT '#ffffff',
    logo_url TEXT,
    logo_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para la nueva tabla
ALTER TABLE qr_visual_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own qr visual versions" 
ON qr_visual_versions FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = qr_visual_versions.profile_id
          AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Users can read their own qr visual versions" 
ON qr_visual_versions FOR SELECT 
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = qr_visual_versions.profile_id
          AND p.user_id = auth.uid()
    )
);

-- Función segura (RPC) para incrementar el contador atómicamente
CREATE OR REPLACE FUNCTION increment_scan_count(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Se ejecuta con permisos de la base de datos, omitiendo RLS para esta acción
AS $$
BEGIN
    UPDATE profiles
    SET scan_count = scan_count + 1
    WHERE id = p_id;
END;
$$;
