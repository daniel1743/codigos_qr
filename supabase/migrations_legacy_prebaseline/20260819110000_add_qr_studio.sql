-- Add QR Studio visual customization fields to the profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS qr_foreground_color varchar(20),
  ADD COLUMN IF NOT EXISTS qr_background_color varchar(20),
  ADD COLUMN IF NOT EXISTS qr_logo_url text,
  ADD COLUMN IF NOT EXISTS qr_logo_enabled boolean DEFAULT false;
