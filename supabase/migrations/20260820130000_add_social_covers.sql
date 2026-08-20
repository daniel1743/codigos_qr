-- Migration to add Social Covers and Hero Social support

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS social_covers_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hero_link_id UUID REFERENCES profile_links(id) ON DELETE SET NULL;
