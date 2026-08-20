-- Add layout composition fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS theme_layout text DEFAULT 'classic_center',
ADD COLUMN IF NOT EXISTS theme_surface text DEFAULT 'transparent',
ADD COLUMN IF NOT EXISTS theme_spacing text DEFAULT 'standard';
