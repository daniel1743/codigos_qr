-- Add bio_bold_weight column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio_bold_weight varchar(255) DEFAULT 'bold';
