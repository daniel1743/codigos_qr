import type { TemplateFamily, TemplateId } from '../types/cripqer';

const FONT = {
  inter: "'Inter', system-ui, sans-serif",
  montserrat: "'Montserrat', system-ui, sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
  cormorant: "'Cormorant Garamond', Georgia, serif",
  dmSerif: "'DM Serif Display', Georgia, serif",
  script: "'Great Vibes', cursive"
};

/**
 * The 12 master visual families. Every value maps to a Magic Editor capability:
 * registered hero variant + height/overlay/fusion, native blocks with supported layouts,
 * supported font pairs and palette tokens. Industry lives in the content pack, not here.
 */
export const templates: TemplateFamily[] = [
{
  id: 'warm_care',
  name: 'Warm Care',
  demo: 'Veterinaria',
  personality: 'Cálida, humana y confiable',
  pageFamily: 'business',
  hero: { variant: 'backgroundFade', height: 'M', overlay: 'none', fusion: 'fade' },
  heroLabel: 'Background fade · M · fusión fade',
  sections: [
  { block: 'services', layout: 'icons' },
  { block: 'gallery', layout: 'row' },
  { block: 'reviews', layout: 'cards', title: 'Familias felices' },
  { block: 'whatsapp' }],

  palette: { bg: '#FBF6EE', surface: '#FFFFFF', text: '#23302A', muted: '#5F6B63', accent: '#2F6B4F', accentText: '#FFFFFF', border: '#E8E0D2' },
  font: { heading: FONT.playfair, body: FONT.inter, headingWeight: 500, label: 'Editorial · Playfair + Inter' },
  cardStyle: 'soft',
  mood: 'light',
  packId: 'pets',
  tags: ['calida', 'humana', 'cercana', 'clara'],
  descriptors: ['verde', 'calida', 'perro', 'veterinaria', 'mascota', 'clara'],
  related: ['local_friendly', 'soft_beauty', 'personal_brand']
},
{
  id: 'dark_craft',
  name: 'Dark Craft',
  demo: 'Barbería',
  personality: 'Oscura, premium y editorial',
  pageFamily: 'business',
  hero: { variant: 'cinematic', height: 'L', overlay: 'intense', fusion: 'none' },
  heroLabel: 'Cinematic · L · overlay intenso',
  sections: [
  { block: 'services', layout: 'cards' },
  { block: 'imageCards', layout: 'grid' },
  { block: 'reviews', layout: 'quote' },
  { block: 'social', layout: 'pills' }],

  palette: { bg: '#0F0E0D', surface: '#1B1A18', text: '#F2EEE6', muted: '#A39C8F', accent: '#B8925A', accentText: '#0F0E0D', border: '#2D2A26' },
  font: { heading: FONT.playfair, body: FONT.inter, headingWeight: 500, label: 'Editorial · Playfair + Inter' },
  cardStyle: 'flat',
  mood: 'dark',
  packId: 'barbershop',
  tags: ['oscura', 'premium', 'elegante', 'seria'],
  descriptors: ['negra', 'negro', 'oscura', 'oscuro', 'barberia', 'barbero'],
  related: ['visual_portfolio', 'minimal_premium', 'editorial_luxury']
},
{
  id: 'soft_beauty',
  name: 'Soft Beauty',
  demo: 'Salón de belleza',
  personality: 'Suave, aspiracional y elegante',
  pageFamily: 'business',
  hero: { variant: 'elegantOverlay', height: 'L', overlay: 'soft', fusion: 'none' },
  heroLabel: 'Elegant overlay · L · overlay suave',
  sections: [
  { block: 'separator', layout: 'luxury' },
  { block: 'services', layout: 'list' },
  { block: 'gallery', layout: 'mosaic' },
  { block: 'reviews', layout: 'quote' },
  { block: 'whatsapp' }],

  palette: { bg: '#F8EEEA', surface: '#FFF9F7', text: '#3B2A2C', muted: '#86696C', accent: '#A35E67', accentText: '#FFFFFF', border: '#EBD9D4' },
  font: { heading: FONT.cormorant, body: FONT.inter, headingWeight: 500, script: FONT.script, label: 'Lujo · Cormorant + script' },
  cardStyle: 'flat',
  mood: 'light',
  packId: 'beauty',
  tags: ['suave', 'elegante', 'delicada', 'clara'],
  descriptors: ['rosa', 'rosada', 'suave', 'belleza', 'salon'],
  related: ['editorial_luxury', 'warm_care', 'minimal_premium']
},
{
  id: 'food_story',
  name: 'Food Story',
  demo: 'Restaurante',
  personality: 'Apetitosa, visual y editorial',
  pageFamily: 'business',
  hero: { variant: 'fullBleed', height: 'L', overlay: 'medium', fusion: 'none' },
  heroLabel: 'Full bleed · L · overlay medio',
  sections: [
  { block: 'services', layout: 'icons' },
  { block: 'gallery', layout: 'row' },
  { block: 'reviews', layout: 'quote' },
  { block: 'location' }],

  palette: { bg: '#F6F0E6', surface: '#FFFCF6', text: '#2B1D14', muted: '#76604F', accent: '#B23A1E', accentText: '#FFFFFF', border: '#E5D9C6' },
  font: { heading: FONT.playfair, body: FONT.inter, headingWeight: 500, label: 'Editorial · Playfair + Inter' },
  cardStyle: 'soft',
  mood: 'light',
  packId: 'restaurant',
  tags: ['visual', 'calida', 'apetitosa', 'editorial'],
  descriptors: ['comida', 'pasta', 'restaurante', 'roja', 'terracota'],
  related: ['local_friendly', 'product_spotlight', 'editorial_luxury']
},
{
  id: 'professional_trust',
  name: 'Professional Trust',
  demo: 'Abogada',
  personality: 'Seria, limpia y con autoridad',
  pageFamily: 'business',
  hero: { variant: 'editorialCenter', height: 'M', overlay: 'none', fusion: 'none' },
  heroLabel: 'Editorial center · M',
  sections: [
  { block: 'services', layout: 'rule', title: 'Áreas de práctica' },
  { block: 'reviews', layout: 'quote' },
  { block: 'separator', layout: 'minimal' },
  { block: 'contact' }],

  palette: { bg: '#FFFFFF', surface: '#F3F5F8', text: '#0F1B2D', muted: '#5A6577', accent: '#1E3A5F', accentText: '#FFFFFF', border: '#E1E5EB' },
  font: { heading: FONT.dmSerif, body: FONT.inter, headingWeight: 400, label: 'Mixta · DM Serif + Inter' },
  cardStyle: 'line',
  mood: 'light',
  packId: 'professional',
  tags: ['seria', 'limpia', 'profesional', 'sobria', 'clara'],
  descriptors: ['azul', 'seria', 'abogada', 'blanca'],
  related: ['personal_brand', 'minimal_premium', 'warm_care']
},
{
  id: 'personal_brand',
  name: 'Personal Brand',
  demo: 'Coach',
  personality: 'Humana, moderna y segura',
  pageFamily: 'bio',
  hero: { variant: 'sideBleed', height: 'L', overlay: 'none', fusion: 'fade' },
  heroLabel: 'Side bleed · L · fusión fade',
  sections: [
  { block: 'services', layout: 'cards' },
  { block: 'video' },
  { block: 'links' },
  { block: 'social', layout: 'solid' }],

  palette: { bg: '#F1EBE3', surface: '#FAF6F0', text: '#1C1A17', muted: '#6E655A', accent: '#1F3B57', accentText: '#FFFFFF', border: '#DED2C2' },
  font: { heading: FONT.playfair, body: FONT.inter, headingWeight: 500, label: 'Editorial · Playfair + Inter' },
  cardStyle: 'soft',
  mood: 'light',
  packId: 'personal',
  tags: ['moderna', 'humana', 'cercana', 'segura'],
  descriptors: ['beige', 'arena', 'coach', 'chico', 'hombre', 'marca personal'],
  related: ['professional_trust', 'bold_creative', 'warm_care']
},
{
  id: 'product_spotlight',
  name: 'Product Spotlight',
  demo: 'Marca de producto',
  personality: 'Comercial y muy visual',
  pageFamily: 'business',
  hero: { variant: 'splitHorizontal', height: 'L', overlay: 'none', fusion: 'none' },
  heroLabel: 'Split horizontal · L',
  sections: [
  { block: 'imageCards', layout: 'row', title: 'Lo más pedido' },
  { block: 'reviews', layout: 'cards' },
  { block: 'cta' }],

  palette: { bg: '#FFFFFF', surface: '#F6F1EB', text: '#1A1A1A', muted: '#66605A', accent: '#C2502A', accentText: '#FFFFFF', border: '#ECE6DF' },
  font: { heading: FONT.montserrat, body: FONT.inter, headingWeight: 800, tracking: 'tight', label: 'Sans · Montserrat extra bold' },
  cardStyle: 'flat',
  mood: 'light',
  packId: 'store',
  tags: ['comercial', 'moderna', 'colorida', 'llamativa'],
  descriptors: ['naranja', 'terracota', 'cafe', 'producto'],
  related: ['food_story', 'bold_creative', 'editorial_luxury']
},
{
  id: 'minimal_premium',
  name: 'Minimal Premium',
  demo: 'Estudio de arquitectura',
  personality: 'Sofisticada y espaciosa',
  pageFamily: 'portfolio',
  hero: { variant: 'minimalPremium', height: 'L', overlay: 'none', fusion: 'none' },
  heroLabel: 'Minimal premium · L',
  sections: [
  { block: 'gallery', layout: 'editorial' },
  { block: 'text' },
  { block: 'separator', layout: 'double' },
  { block: 'contact' }],

  palette: { bg: '#ECEAE5', surface: '#F5F4F0', text: '#232220', muted: '#77736C', accent: '#232220', accentText: '#F5F4F0', border: '#D6D2CA' },
  font: { heading: FONT.inter, body: FONT.inter, headingWeight: 300, label: 'Sans · Inter light' },
  cardStyle: 'line',
  mood: 'light',
  packId: 'studio',
  tags: ['minimal', 'sobria', 'elegante', 'limpia', 'clara'],
  descriptors: ['gris', 'minimal', 'minimalista', 'arquitectura', 'blanca'],
  related: ['visual_portfolio', 'editorial_luxury', 'professional_trust']
},
{
  id: 'bold_creative',
  name: 'Bold Creative',
  demo: 'Artista',
  personality: 'Expresiva y creativa',
  pageFamily: 'portfolio',
  hero: { variant: 'collage', height: 'L', overlay: 'none', fusion: 'none' },
  heroLabel: 'Collage · L',
  sections: [
  { block: 'imageCards', layout: 'grid' },
  { block: 'gallery', layout: 'stacked' },
  { block: 'social', layout: 'solid' },
  { block: 'cta' }],

  palette: { bg: '#F5F1E8', surface: '#FFFFFF', text: '#111111', muted: '#55524C', accent: '#2340D9', accentText: '#FFFFFF', border: '#111111' },
  font: { heading: FONT.montserrat, body: FONT.inter, headingWeight: 800, uppercase: true, tracking: 'tight', label: 'Sans · Montserrat black' },
  cardStyle: 'sharp',
  mood: 'light',
  packId: 'artist',
  tags: ['colorida', 'atrevida', 'creativa', 'llamativa'],
  descriptors: ['colorida', 'colores', 'artista', 'atrevida'],
  related: ['personal_brand', 'visual_portfolio', 'product_spotlight']
},
{
  id: 'local_friendly',
  name: 'Local Friendly',
  demo: 'Florería de barrio',
  personality: 'Cercana y accesible',
  pageFamily: 'business',
  hero: { variant: 'avatarBand', height: 'M', overlay: 'none', fusion: 'none' },
  heroLabel: 'Avatar band · M',
  sections: [
  { block: 'text' },
  { block: 'imageCards', layout: 'grid' },
  { block: 'location' },
  { block: 'reviews', layout: 'cards' },
  { block: 'whatsapp' }],

  palette: { bg: '#FFF8EC', surface: '#FFFFFF', text: '#2C2418', muted: '#6F624F', accent: '#B9561A', accentText: '#FFFFFF', border: '#EFE2CB' },
  font: { heading: FONT.montserrat, body: FONT.inter, headingWeight: 700, label: 'Sans · Montserrat bold' },
  cardStyle: 'soft',
  mood: 'light',
  packId: 'local',
  tags: ['cercana', 'alegre', 'sencilla', 'calida', 'clara'],
  descriptors: ['flores', 'naranja', 'florista', 'floreria', 'alegre'],
  related: ['warm_care', 'food_story', 'product_spotlight']
},
{
  id: 'editorial_luxury',
  name: 'Editorial Luxury',
  demo: 'Joyería',
  personality: 'Lujosa y editorial',
  pageFamily: 'business',
  hero: { variant: 'magazine', height: 'L', overlay: 'medium', fusion: 'none' },
  heroLabel: 'Magazine · L · overlay medio',
  sections: [
  { block: 'separator', layout: 'editorial' },
  { block: 'imageCards', layout: 'row', title: 'La colección' },
  { block: 'gallery', layout: 'carousel' },
  { block: 'cta' }],

  palette: { bg: '#F6F1E9', surface: '#FFFDF8', text: '#1E1A15', muted: '#7D7366', accent: '#7A5A22', accentText: '#FFFDF8', border: '#E3D9C8' },
  font: { heading: FONT.cormorant, body: FONT.inter, headingWeight: 500, label: 'Lujo · Cormorant Garamond' },
  cardStyle: 'flat',
  mood: 'light',
  packId: 'jewelry',
  tags: ['lujo', 'elegante', 'sofisticada', 'editorial', 'clara'],
  descriptors: ['dorada', 'dorado', 'oro', 'joyas', 'joyeria', 'lujo', 'crema'],
  related: ['soft_beauty', 'minimal_premium', 'dark_craft']
},
{
  id: 'visual_portfolio',
  name: 'Visual Portfolio',
  demo: 'Fotógrafo',
  personality: 'Visual primero, premium',
  pageFamily: 'portfolio',
  hero: { variant: 'galleryFrame', height: 'L', overlay: 'none', fusion: 'none' },
  heroLabel: 'Gallery frame · L',
  sections: [
  { block: 'gallery', layout: 'stacked' },
  { block: 'reviews', layout: 'quote' },
  { block: 'contact' }],

  palette: { bg: '#16181A', surface: '#212427', text: '#EDEBE6', muted: '#9A9993', accent: '#EDEBE6', accentText: '#16181A', border: '#2E3236' },
  font: { heading: FONT.inter, body: FONT.inter, headingWeight: 300, label: 'Sans · Inter light' },
  cardStyle: 'line',
  mood: 'dark',
  packId: 'photographer',
  tags: ['visual', 'minimal', 'sobria', 'oscura'],
  descriptors: ['montana', 'paisaje', 'fotografo', 'fotografia'],
  related: ['minimal_premium', 'dark_craft', 'bold_creative']
}];


export const initialTemplateIds: TemplateId[] = ['warm_care', 'dark_craft', 'food_story', 'personal_brand', 'editorial_luxury'];

/** Families that rotate in, one card at a time. */
export const rotationQueue: TemplateId[] = [
'soft_beauty',
'professional_trust',
'product_spotlight',
'bold_creative',
'minimal_premium',
'local_friendly',
'visual_portfolio'];


export const moodFilters: {id: string;label: string;tags: string[];}[] = [
{ id: 'all', label: 'Todas', tags: [] },
{ id: 'warm', label: 'Cálidas', tags: ['calida', 'cercana'] },
{ id: 'elegant', label: 'Elegantes', tags: ['elegante', 'lujo'] },
{ id: 'dark', label: 'Oscuras', tags: ['oscura'] },
{ id: 'bold', label: 'Llamativas', tags: ['colorida', 'llamativa'] }];


export const blockLabels: Record<string, string> = {
  hero: 'Portada',
  services: 'Servicios',
  reviews: 'Reseñas',
  whatsapp: 'Botón de WhatsApp',
  imageCards: 'Tarjetas con imagen',
  social: 'Redes sociales',
  gallery: 'Galería',
  location: 'Ubicación',
  profile: 'Perfil',
  links: 'Enlaces',
  cta: 'Llamado a la acción',
  text: 'Texto',
  contact: 'Contacto',
  video: 'Video',
  separator: 'Separador'
};

export const pageFamilyLabels: Record<string, string> = {
  business: 'Negocio',
  bio: 'Bio',
  portfolio: 'Portafolio'
};

export const layoutLabels: Record<string, string> = {
  icons: 'íconos',
  rule: 'líneas',
  cards: 'tarjetas',
  list: 'lista',
  row: 'fila',
  mosaic: 'mosaico',
  carousel: 'carrusel',
  editorial: 'editorial',
  stacked: 'apilada',
  grid: 'cuadrícula',
  quote: 'cita',
  pills: 'píldoras',
  solid: 'sólidas',
  luxury: 'lujo',
  minimal: 'mínimo',
  double: 'doble',
  'dot-center': 'punto'
};