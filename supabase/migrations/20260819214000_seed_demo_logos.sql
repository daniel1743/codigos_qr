-- Seed: Insert 25 demo logos into demo_logos table
-- Logos for Premium QR customization

INSERT INTO demo_logos (name, category, file_url, preview_url, tier) VALUES

-- BUSINESS (5)
('Briefcase', 'business', 'https://placehold.co/200x200/17324D/FFFFFF?text=briefcase', 'https://placehold.co/50x50/17324D/FFFFFF?text=B', 'premium'),
('Chart', 'business', 'https://placehold.co/200x200/17324D/FFFFFF?text=chart', 'https://placehold.co/50x50/17324D/FFFFFF?text=C', 'premium'),
('Handshake', 'business', 'https://placehold.co/200x200/17324D/FFFFFF?text=handshake', 'https://placehold.co/50x50/17324D/FFFFFF?text=H', 'premium'),
('Star', 'business', 'https://placehold.co/200x200/17324D/FFFFFF?text=star', 'https://placehold.co/50x50/17324D/FFFFFF?text=S', 'premium'),
('Checkmark', 'business', 'https://placehold.co/200x200/17324D/FFFFFF?text=check', 'https://placehold.co/50x50/17324D/FFFFFF?text=✓', 'premium'),

-- FOOD (5)
('Fork & Knife', 'food', 'https://placehold.co/200x200/9A3412/FFFFFF?text=fork', 'https://placehold.co/50x50/9A3412/FFFFFF?text=F', 'premium'),
('Coffee Cup', 'food', 'https://placehold.co/200x200/9A3412/FFFFFF?text=coffee', 'https://placehold.co/50x50/9A3412/FFFFFF?text=☕', 'premium'),
('Cake Slice', 'food', 'https://placehold.co/200x200/9A3412/FFFFFF?text=cake', 'https://placehold.co/50x50/9A3412/FFFFFF?text=🍰', 'premium'),
('Wine Glass', 'food', 'https://placehold.co/200x200/9A3412/FFFFFF?text=wine', 'https://placehold.co/50x50/9A3412/FFFFFF?text=🍷', 'premium'),
('Chef Hat', 'food', 'https://placehold.co/200x200/9A3412/FFFFFF?text=chef', 'https://placehold.co/50x50/9A3412/FFFFFF?text=👨', 'premium'),

-- BEAUTY (5)
('Sparkles', 'beauty', 'https://placehold.co/200x200/BE185D/FFFFFF?text=sparkles', 'https://placehold.co/50x50/BE185D/FFFFFF?text=✨', 'premium'),
('Flower', 'beauty', 'https://placehold.co/200x200/BE185D/FFFFFF?text=flower', 'https://placehold.co/50x50/BE185D/FFFFFF?text=🌸', 'premium'),
('Heart', 'beauty', 'https://placehold.co/200x200/BE185D/FFFFFF?text=heart', 'https://placehold.co/50x50/BE185D/FFFFFF?text=❤', 'premium'),
('Leaf', 'beauty', 'https://placehold.co/200x200/BE185D/FFFFFF?text=leaf', 'https://placehold.co/50x50/BE185D/FFFFFF?text=🍃', 'premium'),
('Scissors', 'beauty', 'https://placehold.co/200x200/BE185D/FFFFFF?text=scissors', 'https://placehold.co/50x50/BE185D/FFFFFF?text=✂', 'premium'),

-- TECH (5)
('Code', 'tech', 'https://placehold.co/200x200/1E40AF/FFFFFF?text=code', 'https://placehold.co/50x50/1E40AF/FFFFFF?text={', 'premium'),
('CPU', 'tech', 'https://placehold.co/200x200/1E40AF/FFFFFF?text=cpu', 'https://placehold.co/50x50/1E40AF/FFFFFF?text=⚙', 'premium'),
('WiFi', 'tech', 'https://placehold.co/200x200/1E40AF/FFFFFF?text=wifi', 'https://placehold.co/50x50/1E40AF/FFFFFF?text=📶', 'premium'),
('Rocket', 'tech', 'https://placehold.co/200x200/1E40AF/FFFFFF?text=rocket', 'https://placehold.co/50x50/1E40AF/FFFFFF?text=🚀', 'premium'),
('Gear', 'tech', 'https://placehold.co/200x200/1E40AF/FFFFFF?text=gear', 'https://placehold.co/50x50/1E40AF/FFFFFF?text=⚙️', 'premium'),

-- CREATIVE (5)
('Palette', 'creative', 'https://placehold.co/200x200/7C3AED/FFFFFF?text=palette', 'https://placehold.co/50x50/7C3AED/FFFFFF?text=🎨', 'premium'),
('Camera', 'creative', 'https://placehold.co/200x200/7C3AED/FFFFFF?text=camera', 'https://placehold.co/50x50/7C3AED/FFFFFF?text=📷', 'premium'),
('Music Note', 'creative', 'https://placehold.co/200x200/7C3AED/FFFFFF?text=music', 'https://placehold.co/50x50/7C3AED/FFFFFF?text=🎵', 'premium'),
('Pen', 'creative', 'https://placehold.co/200x200/7C3AED/FFFFFF?text=pen', 'https://placehold.co/50x50/7C3AED/FFFFFF?text=✏', 'premium'),
('Brush', 'creative', 'https://placehold.co/200x200/7C3AED/FFFFFF?text=brush', 'https://placehold.co/50x50/7C3AED/FFFFFF?text=🖌', 'premium');

-- Nota: Los URLs de placeholder.com son temporales para testing.
-- En producción, necesitarás:
-- 1. Crear archivos SVG reales para cada logo
-- 2. Subirlos a Supabase Storage en bucket 'demo-logos'
-- 3. Actualizar los file_url y preview_url con las URLs reales
