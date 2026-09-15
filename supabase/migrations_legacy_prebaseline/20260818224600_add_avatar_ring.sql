-- Migration to add basic avatar ring settings
ALTER TABLE profiles
ADD COLUMN ring_enabled BOOLEAN DEFAULT false,
ADD COLUMN ring_color TEXT DEFAULT '#000000',
ADD COLUMN ring_thickness TEXT DEFAULT 'thin';
