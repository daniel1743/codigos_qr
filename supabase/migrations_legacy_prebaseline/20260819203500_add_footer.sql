-- Migration to add footer configuration to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS footer_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS footer_text varchar(255);
