-- Migration to add button_style to profiles
ALTER TABLE profiles
ADD COLUMN button_style TEXT NOT NULL DEFAULT 'solid' CHECK (button_style IN ('solid', 'outline', 'soft', 'pill', 'minimal', 'line', 'card'));
