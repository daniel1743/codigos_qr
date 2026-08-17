-- ========================================================
-- Phase 4: Database Schema & Phase 5: Database Integrity
-- ========================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a reusable function for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. PROFILES
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    avatar_shape TEXT DEFAULT 'circle',
    font_family TEXT DEFAULT 'sans',
    background_color TEXT DEFAULT '#FFFFFF',
    button_color TEXT DEFAULT '#111111',
    button_text_color TEXT DEFAULT '#FFFFFF',
    button_radius TEXT DEFAULT 'rounded',
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT no_empty_slug CHECK (char_length(slug) > 0),
    CONSTRAINT slug_is_lowercase CHECK (slug = lower(slug))
);

-- Trigger for profiles updated_at
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 2. PROFILE LINKS
CREATE TABLE profile_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    icon_key TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for profile_links updated_at
CREATE TRIGGER set_profile_links_updated_at
BEFORE UPDATE ON profile_links
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- Indexes
CREATE INDEX idx_profiles_slug ON profiles(slug);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profile_links_profile_id ON profile_links(profile_id);
CREATE INDEX idx_profile_links_profile_id_sort_order ON profile_links(profile_id, sort_order);

-- ========================================================
-- Phase 6: Row Level Security (RLS)
-- ========================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_links ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "owner_insert_profile" ON profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_select_profile" ON profiles
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "owner_update_profile" ON profiles
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_delete_profile" ON profiles
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "public_select_published_profile" ON profiles
    FOR SELECT TO anon USING (published = true);

-- Profile Links Policies
CREATE POLICY "owner_insert_link" ON profile_links
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.user_id = auth.uid())
    );

CREATE POLICY "owner_select_link" ON profile_links
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.user_id = auth.uid())
    );

CREATE POLICY "owner_update_link" ON profile_links
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.user_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.user_id = auth.uid())
    );

CREATE POLICY "owner_delete_link" ON profile_links
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.user_id = auth.uid())
    );

CREATE POLICY "public_select_published_link" ON profile_links
    FOR SELECT TO anon USING (
        enabled = true AND 
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.published = true)
    );

-- ========================================================
-- Phase 7: Storage
-- ========================================================

-- Insert buckets if not exists
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true) ON CONFLICT (id) DO NOTHING;

-- Avatars Policies
CREATE POLICY "owner_insert_avatar" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'avatars' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "public_select_avatar" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'avatars');

CREATE POLICY "owner_update_avatar" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'avatars' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "owner_delete_avatar" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'avatars' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Banners Policies
CREATE POLICY "owner_insert_banner" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'banners' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "public_select_banner" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'banners');

CREATE POLICY "owner_update_banner" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'banners' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "owner_delete_banner" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'banners' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );
