-- PASS B: Extend template_bank with administrative workflow fields
-- Migration: Add publication workflow and metadata for Template Factory

-- Add new workflow columns
ALTER TABLE template_bank
ADD COLUMN IF NOT EXISTS publication_status TEXT DEFAULT 'GENERATED_PRIVATE'
    CHECK (publication_status IN (
        'GENERATED_PRIVATE',
        'REVIEW_PENDING',
        'APPROVED',
        'PUBLIC',
        'ARCHIVED',
        'REJECTED'
    )),
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS style TEXT,
ADD COLUMN IF NOT EXISTS theme TEXT,
ADD COLUMN IF NOT EXISTS layout TEXT,
ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS generation_source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS generator_version TEXT,
ADD COLUMN IF NOT EXISTS batch_id TEXT,
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'valid', 'invalid')),
ADD COLUMN IF NOT EXISTS qa_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS qa_findings JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_template_bank_publication_status ON template_bank(publication_status);
CREATE INDEX IF NOT EXISTS idx_template_bank_category ON template_bank(category);
CREATE INDEX IF NOT EXISTS idx_template_bank_industry ON template_bank(industry);
CREATE INDEX IF NOT EXISTS idx_template_bank_batch_id ON template_bank(batch_id);
CREATE INDEX IF NOT EXISTS idx_template_bank_validation_status ON template_bank(validation_status);
CREATE INDEX IF NOT EXISTS idx_template_bank_approved_by ON template_bank(approved_by);

-- Update existing RLS policies to work with publication_status
-- Drop old policies
DROP POLICY IF EXISTS "Public templates are viewable by everyone" ON template_bank;
DROP POLICY IF EXISTS "Users can view their own templates" ON template_bank;

-- Create new policies that respect publication workflow
CREATE POLICY "Public templates visible to everyone"
ON template_bank FOR SELECT
USING (publication_status = 'PUBLIC' AND is_public = true);

CREATE POLICY "Users can view own templates"
ON template_bank FOR SELECT
USING (auth.uid() = created_by);

-- Admin-only policies (will be enforced additionally at app level)
-- Admin can see all templates
CREATE POLICY "Admin can view all templates"
ON template_bank FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM admin_users
        WHERE admin_users.user_id = auth.uid()
    )
);

-- Admin can update templates
CREATE POLICY "Admin can update templates"
ON template_bank FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM admin_users
        WHERE admin_users.user_id = auth.uid()
    )
);

-- Admin can delete templates
CREATE POLICY "Admin can delete templates"
ON template_bank FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM admin_users
        WHERE admin_users.user_id = auth.uid()
    )
);

-- Function to validate state transitions
CREATE OR REPLACE FUNCTION validate_template_state_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- GENERATED_PRIVATE can go to: REVIEW_PENDING, ARCHIVED, REJECTED
    IF OLD.publication_status = 'GENERATED_PRIVATE' THEN
        IF NEW.publication_status NOT IN ('GENERATED_PRIVATE', 'REVIEW_PENDING', 'ARCHIVED', 'REJECTED') THEN
            RAISE EXCEPTION 'Invalid transition from GENERATED_PRIVATE to %', NEW.publication_status;
        END IF;
    END IF;

    -- REVIEW_PENDING can go to: APPROVED, REJECTED, ARCHIVED
    IF OLD.publication_status = 'REVIEW_PENDING' THEN
        IF NEW.publication_status NOT IN ('REVIEW_PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED') THEN
            RAISE EXCEPTION 'Invalid transition from REVIEW_PENDING to %', NEW.publication_status;
        END IF;
    END IF;

    -- APPROVED can go to: PUBLIC, REVIEW_PENDING, ARCHIVED
    IF OLD.publication_status = 'APPROVED' THEN
        IF NEW.publication_status NOT IN ('APPROVED', 'PUBLIC', 'REVIEW_PENDING', 'ARCHIVED') THEN
            RAISE EXCEPTION 'Invalid transition from APPROVED to %', NEW.publication_status;
        END IF;
    END IF;

    -- PUBLIC can go to: APPROVED (unpublish), ARCHIVED
    IF OLD.publication_status = 'PUBLIC' THEN
        IF NEW.publication_status NOT IN ('PUBLIC', 'APPROVED', 'ARCHIVED') THEN
            RAISE EXCEPTION 'Invalid transition from PUBLIC to %', NEW.publication_status;
        END IF;
        -- When unpublishing, set is_public to false
        IF NEW.publication_status != 'PUBLIC' THEN
            NEW.is_public := false;
            NEW.published_at := NULL;
        END IF;
    END IF;

    -- REJECTED can go to: REVIEW_PENDING, ARCHIVED
    IF OLD.publication_status = 'REJECTED' THEN
        IF NEW.publication_status NOT IN ('REJECTED', 'REVIEW_PENDING', 'ARCHIVED') THEN
            RAISE EXCEPTION 'Invalid transition from REJECTED to %', NEW.publication_status;
        END IF;
    END IF;

    -- ARCHIVED can go to: REVIEW_PENDING, APPROVED (restore)
    IF OLD.publication_status = 'ARCHIVED' THEN
        IF NEW.publication_status NOT IN ('ARCHIVED', 'REVIEW_PENDING', 'APPROVED') THEN
            RAISE EXCEPTION 'Invalid transition from ARCHIVED to %', NEW.publication_status;
        END IF;
    END IF;

    -- Automatically set timestamps
    IF NEW.publication_status = 'APPROVED' AND OLD.publication_status != 'APPROVED' THEN
        NEW.approved_at := NOW();
        NEW.approved_by := auth.uid();
    END IF;

    IF NEW.publication_status = 'PUBLIC' AND OLD.publication_status != 'PUBLIC' THEN
        NEW.published_at := NOW();
        NEW.is_public := true;
    END IF;

    IF NEW.publication_status = 'ARCHIVED' AND OLD.publication_status != 'ARCHIVED' THEN
        NEW.archived_at := NOW();
    END IF;

    IF NEW.publication_status = 'REJECTED' AND OLD.publication_status != 'REJECTED' THEN
        NEW.rejected_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for state transitions
DROP TRIGGER IF EXISTS validate_template_state_transition_trigger ON template_bank;
CREATE TRIGGER validate_template_state_transition_trigger
BEFORE UPDATE ON template_bank
FOR EACH ROW
WHEN (OLD.publication_status IS DISTINCT FROM NEW.publication_status)
EXECUTE FUNCTION validate_template_state_transition();

-- Update existing templates to have proper status
UPDATE template_bank
SET publication_status = CASE
    WHEN is_public = true THEN 'PUBLIC'
    ELSE 'GENERATED_PRIVATE'
END
WHERE publication_status IS NULL OR publication_status = 'GENERATED_PRIVATE';

-- Comment on the table
COMMENT ON TABLE template_bank IS 'Template Factory private library with administrative workflow support';
COMMENT ON COLUMN template_bank.publication_status IS 'Workflow state: GENERATED_PRIVATE -> REVIEW_PENDING -> APPROVED -> PUBLIC';
COMMENT ON COLUMN template_bank.batch_id IS 'Batch identifier for templates generated together by the automatic generator';
COMMENT ON COLUMN template_bank.qa_score IS 'Automated QA score from 0.00 to 1.00';
COMMENT ON COLUMN template_bank.generation_source IS 'Source of template: manual, generator_v1, etc';
