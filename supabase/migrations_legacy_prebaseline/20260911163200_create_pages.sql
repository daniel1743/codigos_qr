CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id),
    profile_id UUID NOT NULL REFERENCES profiles(id),
    public_id TEXT NOT NULL UNIQUE DEFAULT generate_profile_public_id(),
    title TEXT NOT NULL,
    page_type TEXT NOT NULL DEFAULT 'landing',
    template_config JSONB,
    published_template_config JSONB,
    published BOOLEAN NOT NULL DEFAULT false,
    published_revision INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    slug TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT page_type_check CHECK (page_type IN ('landing', 'promotion', 'menu', 'campaign', 'event'))
);

CREATE UNIQUE INDEX idx_pages_slug_unique ON pages(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_pages_owner_user_id ON pages(owner_user_id);
CREATE INDEX idx_pages_profile_id ON pages(profile_id);
CREATE INDEX idx_pages_published ON pages(published);

CREATE TRIGGER set_pages_updated_at
BEFORE UPDATE ON pages
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_insert_page" ON pages
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "owner_select_page" ON pages
    FOR SELECT TO authenticated USING (auth.uid() = owner_user_id);

CREATE POLICY "owner_update_page" ON pages
    FOR UPDATE TO authenticated USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "owner_delete_page" ON pages
    FOR DELETE TO authenticated USING (auth.uid() = owner_user_id);

