-- Seed: Insert 25 demo logos into demo_logos table
-- Logos for Premium QR customization

INSERT INTO demo_logos (name, category, file_url, preview_url, tier) VALUES

-- BUSINESS (5)
('Briefcase', 'business', 'https://via.placeholder.com/200/17324D/FFFFFF?text=briefcase', 'https://via.placeholder.com/50/17324D/FFFFFF?text=B', 'premium'),
('Chart', 'business', 'https://via.placeholder.com/200/17324D/FFFFFF?text=chart', 'https://via.placeholder.com/50/17324D/FFFFFF?text=C', 'premium'),
('Handshake', 'business', 'https://via.placeholder.com/200/17324D/FFFFFF?text=handshake', 'https://via.placeholder.com/50/17324D/FFFFFF?text=H', 'premium'),
('Star', 'business', 'https://via.placeholder.com/200/17324D/FFFFFF?text=star', 'https://via.placeholder.com/50/17324D/FFFFFF?text=S', 'premium'),
('Checkmark', 'business', 'https://via.placeholder.com/200/17324D/FFFFFF?text=check', 'https://via.placeholder.com/50/17324D/FFFFFF?text=✓', 'premium'),

-- FOOD (5)
('Fork & Knife', 'food', 'https://via.placeholder.com/200/9A3412/FFFFFF?text=fork', 'https://via.placeholder.com/50/9A3412/FFFFFF?text=F', 'premium'),
('Coffee Cup', 'food', 'https://via.placeholder.com/200/9A3412/FFFFFF?text=coffee', 'https://via.placeholder.com/50/9A3412/FFFFFF?text=☕', 'premium'),
('Cake Slice', 'food', 'https://via.placeholder.com/200/9A3412/FFFFFF?text=cake', 'https://via.placeholder.com/50/9A3412/FFFFFF?text=🍰', 'premium'),
('Wine Glass', 'food', 'https://via.placeholder.com/200/9A3412/FFFFFF?text=wine', 'https://via.placeholder.com/50/9A3412/FFFFFF?text=🍷', 'premium'),
('Chef Hat', 'food', 'https://via.placeholder.com/200/9A3412/FFFFFF?text=chef', 'https://via.placeholder.com/50/9A3412/FFFFFF?text=👨', 'premium'),

-- BEAUTY (5)
('Sparkles', 'beauty', 'https://via.placeholder.com/200/BE185D/FFFFFF?text=sparkles', 'https://via.placeholder.com/50/BE185D/FFFFFF?text=✨', 'premium'),
('Flower', 'beauty', 'https://via.placeholder.com/200/BE185D/FFFFFF?text=flower', 'https://via.placeholder.com/50/BE185D/FFFFFF?text=🌸', 'premium'),
('Heart', 'beauty', 'https://via.placeholder.com/200/BE185D/FFFFFF?text=heart', 'https://via.placeholder.com/50/BE185D/FFFFFF?text=❤', 'premium'),
('Leaf', 'beauty', 'https://via.placeholder.com/200/BE185D/FFFFFF?text=leaf', 'https://via.placeholder.com/50/BE185D/FFFFFF?text=🍃', 'premium'),
('Scissors', 'beauty', 'https://via.placeholder.com/200/BE185D/FFFFFF?text=scissors', 'https://via.placeholder.com/50/BE185D/FFFFFF?text=✂', 'premium'),

-- TECH (5)
('Code', 'tech', 'https://via.placeholder.com/200/1E40AF/FFFFFF?text=code', 'https://via.placeholder.com/50/1E40AF/FFFFFF?text={', 'premium'),
('CPU', 'tech', 'https://via.placeholder.com/200/1E40AF/FFFFFF?text=cpu', 'https://via.placeholder.com/50/1E40AF/FFFFFF?text=⚙', 'premium'),
('WiFi', 'tech', 'https://via.placeholder.com/200/1E40AF/FFFFFF?text=wifi', 'https://via.placeholder.com/50/1E40AF/FFFFFF?text=📶', 'premium'),
('Rocket', 'tech', 'https://via.placeholder.com/200/1E40AF/FFFFFF?text=rocket', 'https://via.placeholder.com/50/1E40AF/FFFFFF?text=🚀', 'premium'),
('Gear', 'tech', 'https://via.placeholder.com/200/1E40AF/FFFFFF?text=gear', 'https://via.placeholder.com/50/1E40AF/FFFFFF?text=⚙️', 'premium'),

-- CREATIVE (5)
('Palette', 'creative', 'https://via.placeholder.com/200/7C3AED/FFFFFF?text=palette', 'https://via.placeholder.com/50/7C3AED/FFFFFF?text=🎨', 'premium'),
('Camera', 'creative', 'https://via.placeholder.com/200/7C3AED/FFFFFF?text=camera', 'https://via.placeholder.com/50/7C3AED/FFFFFF?text=📷', 'premium'),
('Music Note', 'creative', 'https://via.placeholder.com/200/7C3AED/FFFFFF?text=music', 'https://via.placeholder.com/50/7C3AED/FFFFFF?text=🎵', 'premium'),
('Pen', 'creative', 'https://via.placeholder.com/200/7C3AED/FFFFFF?text=pen', 'https://via.placeholder.com/50/7C3AED/FFFFFF?text=✏', 'premium'),
('Brush', 'creative', 'https://via.placeholder.com/200/7C3AED/FFFFFF?text=brush', 'https://via.placeholder.com/50/7C3AED/FFFFFF?text=🖌', 'premium');

-- Nota: Los URLs de placeholder.com son temporales para testing.
-- En producción, necesitarás:
-- 1. Crear archivos SVG reales para cada logo
-- 2. Subirlos a Supabase Storage en bucket 'demo-logos'
-- 3. Actualizar los file_url y preview_url con las URLs reales
