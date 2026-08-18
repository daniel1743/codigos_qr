-- Add a system-generated, immutable public identifier for profile QR URLs.
-- This migration is safe for existing profiles: it backfills missing values
-- before enforcing NOT NULL and uniqueness.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION generate_profile_public_id()
RETURNS TEXT AS $$
DECLARE
    alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..7 LOOP
        result := result || substr(alphabet, floor(random() * length(alphabet) + 1)::INTEGER, 1);
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS public_id TEXT;

ALTER TABLE profiles
ALTER COLUMN public_id SET DEFAULT generate_profile_public_id();

DO $$
DECLARE
    profile_record RECORD;
    candidate TEXT;
BEGIN
    FOR profile_record IN SELECT id FROM profiles WHERE public_id IS NULL LOOP
        LOOP
            candidate := generate_profile_public_id();
            EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE public_id = candidate);
        END LOOP;

        UPDATE profiles
        SET public_id = candidate
        WHERE id = profile_record.id;
    END LOOP;
END;
$$;

ALTER TABLE profiles
ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_public_id_unique ON profiles(public_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'public_id_url_safe'
    ) THEN
        ALTER TABLE profiles
        ADD CONSTRAINT public_id_url_safe CHECK (public_id ~ '^[A-Za-z0-9]+$');
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_profile_public_id_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.public_id IS NOT NULL AND NEW.public_id IS DISTINCT FROM OLD.public_id THEN
        RAISE EXCEPTION 'public_id is immutable';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_profiles_public_id_change ON profiles;
CREATE TRIGGER prevent_profiles_public_id_change
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_profile_public_id_change();
