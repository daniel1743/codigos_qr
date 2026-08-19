-- Agregar campos de tipografia y composicion de texto
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS title_color text,
  ADD COLUMN IF NOT EXISTS title_size text DEFAULT 'lg',
  ADD COLUMN IF NOT EXISTS title_weight text DEFAULT 'bold',
  ADD COLUMN IF NOT EXISTS title_align text DEFAULT 'center',

  ADD COLUMN IF NOT EXISTS bio_color text,
  ADD COLUMN IF NOT EXISTS bio_size text DEFAULT 'md',
  ADD COLUMN IF NOT EXISTS bio_weight text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS bio_align text DEFAULT 'center',

  ADD COLUMN IF NOT EXISTS button_text_size text DEFAULT 'md',
  ADD COLUMN IF NOT EXISTS button_text_weight text DEFAULT 'semibold',
  ADD COLUMN IF NOT EXISTS button_content_align text DEFAULT 'left',
  ADD COLUMN IF NOT EXISTS button_icon_position text DEFAULT 'left';
