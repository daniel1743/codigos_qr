-- Template Bank Table for storing reusable bio link templates
CREATE TABLE IF NOT EXISTS template_bank (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    preview_image TEXT,

    -- Template configuration (JSON format compatible with BioTemplateConfig)
    config_json JSONB NOT NULL,

    -- CSS variables from the canvas engine
    css_variables JSONB,

    -- Template type: 'premium' or 'private'
    template_type TEXT NOT NULL DEFAULT 'private' CHECK (template_type IN ('premium', 'private')),

    -- Visibility
    is_public BOOLEAN DEFAULT false,

    -- Ownership
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Usage tracking
    usage_count INTEGER DEFAULT 0
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_template_bank_type ON template_bank(template_type);
CREATE INDEX IF NOT EXISTS idx_template_bank_public ON template_bank(is_public);
CREATE INDEX IF NOT EXISTS idx_template_bank_created_by ON template_bank(created_by);

-- RLS Policies
ALTER TABLE template_bank ENABLE ROW LEVEL SECURITY;

-- Allow users to read public templates and premium templates
CREATE POLICY "Public templates are viewable by everyone"
ON template_bank FOR SELECT
USING (is_public = true OR template_type = 'premium');

-- Allow users to read their own private templates
CREATE POLICY "Users can view their own templates"
ON template_bank FOR SELECT
USING (auth.uid() = created_by);

-- Allow users to create templates
CREATE POLICY "Users can create templates"
ON template_bank FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own templates
CREATE POLICY "Users can update their own templates"
ON template_bank FOR UPDATE
USING (auth.uid() = created_by);

-- Allow users to delete their own templates
CREATE POLICY "Users can delete their own templates"
ON template_bank FOR DELETE
USING (auth.uid() = created_by);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_template_bank_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER template_bank_updated_at
BEFORE UPDATE ON template_bank
FOR EACH ROW
EXECUTE FUNCTION update_template_bank_updated_at();
