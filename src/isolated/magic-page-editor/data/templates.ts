import { images } from './images';
import type { TemplateId, TemplateMeta } from '../types/editor';

export const templates: Record<TemplateId, TemplateMeta> = {
  bio: {
    id: 'bio',
    name: 'Bio minimalista premium',
    short: 'Bio',
    description: 'Link-in-bio personal: portada curva, avatar superpuesto, botones altos y redes.',
    demonstrates: ['Portada + avatar superpuesto', 'Botones altos y elegantes', 'Redes sociales', 'Contenedor de 3 imágenes'],
    slug: 'marinasole',
    preview: images.bioHero,
    fontsLabel: 'Cormorant Garamond + Inter',
    theme: {
      accent: '#56604A',
      accentFg: '#F6F2EA',
      radius: 28,
      swatches: ['#2A2521', '#7A6F65', '#56604A', '#A2764F', '#FFFFFF'],
      tones: [
      { id: 'crema', label: 'Crema', color: '#F5F0E8', fg: '#2A2521', muted: '#7A6F65', surface: '#FBF8F3', line: '#E4DACB' },
      { id: 'arena', label: 'Arena', color: '#ECE3D5', fg: '#2A2521', muted: '#6F655B', surface: '#F7F2EA', line: '#DDD1BF' },
      { id: 'blanco', label: 'Blanco', color: '#FFFFFF', fg: '#2A2521', muted: '#7A6F65', surface: '#F6F1EA', line: '#ECE5DA' },
      { id: 'oliva', label: 'Oliva', color: '#56604A', fg: '#F6F2EA', muted: '#D4D6C8', surface: '#626D55', line: '#6E785F' },
      { id: 'tinta', label: 'Tinta', color: '#2A2521', fg: '#F5F0E8', muted: '#B9AEA2', surface: '#362F2A', line: '#463E37' }],

      pageTones: ['crema', 'arena', 'blanco'],
      fonts: [
      { id: 'editorial', label: 'Editorial', display: "'Cormorant Garamond', serif", body: "'Inter', sans-serif" },
      { id: 'moderna', label: 'Moderna', display: "'Manrope', sans-serif", body: "'Manrope', sans-serif" },
      { id: 'clasica', label: 'Clásica', display: "'Bodoni Moda', serif", body: "'Inter Tight', sans-serif" }]

    },
    initialBlocks: [
    { key: 'hero', type: 'hero' },
    { key: 'social', type: 'social' },
    { key: 'links', type: 'links' },
    { key: 'collection', type: 'collection' },
    { key: 'gallery', type: 'gallery' }],

    tour: {
      text: 'hero.bio',
      hero: 'block:hero',
      avatar: 'avatar',
      cta: 'links.0',
      card: 'collection.0',
      gallery: 'gallery',
      section: 'block:links'
    }
  },
  business: {
    id: 'business',
    name: 'Negocio / Servicios premium',
    short: 'Negocio',
    description: 'Clínica de estética: portada dividida, bloques CTA largos, servicios y ubicación.',
    demonstrates: ['CTA largos premium', 'Cards de servicio con imagen', 'Portada dividida', 'Ubicación'],
    slug: 'clinica-aurea',
    preview: images.bizClinic,
    fontsLabel: 'Marcellus + Manrope',
    theme: {
      accent: '#1F4E55',
      accentFg: '#F4EEE8',
      radius: 22,
      swatches: ['#1C2F33', '#5E6D6F', '#1F4E55', '#B08D5E', '#FFFFFF'],
      tones: [
      { id: 'arena', label: 'Arena', color: '#F4EEE8', fg: '#1C2F33', muted: '#5E6D6F', surface: '#FFFFFF', line: '#E3D9CE' },
      { id: 'blanco', label: 'Blanco', color: '#FFFFFF', fg: '#1C2F33', muted: '#5E6D6F', surface: '#F6F1EC', line: '#ECE4DB' },
      { id: 'petroleo', label: 'Petróleo', color: '#1F4E55', fg: '#F4EEE8', muted: '#BFD0CF', surface: '#275C63', line: '#33686F' },
      { id: 'noche', label: 'Noche', color: '#13272B', fg: '#F1E9E0', muted: '#A8B5B4', surface: '#1C3338', line: '#2A4348' }],

      pageTones: ['arena', 'blanco'],
      fonts: [
      { id: 'firma', label: 'Firma', display: "'Marcellus', serif", body: "'Manrope', sans-serif" },
      { id: 'editorial', label: 'Editorial', display: "'Cormorant Garamond', serif", body: "'Inter', sans-serif" },
      { id: 'moderna', label: 'Moderna', display: "'Inter Tight', sans-serif", body: "'Inter Tight', sans-serif" }]

    },
    initialBlocks: [
    { key: 'hero', type: 'hero' },
    { key: 'collection', type: 'collection' },
    { key: 'links', type: 'links' },
    { key: 'gallery', type: 'gallery' },
    { key: 'location', type: 'location' }],

    tour: {
      text: 'hero.text',
      hero: 'block:hero',
      avatar: 'avatar',
      cta: 'hero.cta',
      card: 'collection.0',
      gallery: 'gallery',
      section: 'block:links'
    }
  },
  portfolio: {
    id: 'portfolio',
    name: 'Portfolio visual premium',
    short: 'Portfolio',
    description: 'Fotografía de arquitectura: portada a sangre, galería editorial e índice de proyectos.',
    demonstrates: ['Portada de imagen a sangre', 'Galería editorial en mosaico', 'Índice de proyectos', 'Composición oscura'],
    slug: 'olmo',
    preview: images.pfHero,
    fontsLabel: 'Bodoni Moda + Inter Tight',
    theme: {
      accent: '#D9C7A7',
      accentFg: '#121211',
      radius: 4,
      swatches: ['#ECE6DB', '#9A9387', '#D9C7A7', '#B86A45', '#121211'],
      tones: [
      { id: 'carbon', label: 'Carbón', color: '#121211', fg: '#ECE6DB', muted: '#9A9387', surface: '#1B1B19', line: '#2D2C28' },
      { id: 'grafito', label: 'Grafito', color: '#1C1C1A', fg: '#ECE6DB', muted: '#A29B8F', surface: '#252522', line: '#34332F' },
      { id: 'hueso', label: 'Hueso', color: '#ECE6DB', fg: '#151513', muted: '#6C665D', surface: '#E2DACC', line: '#D4CBBB' },
      { id: 'piedra', label: 'Piedra', color: '#D9CFBF', fg: '#151513', muted: '#5E584F', surface: '#CFC4B2', line: '#C2B6A2' }],

      pageTones: ['carbon', 'grafito'],
      fonts: [
      { id: 'bodoni', label: 'Editorial', display: "'Bodoni Moda', serif", body: "'Inter Tight', sans-serif" },
      { id: 'garamond', label: 'Clásica', display: "'Cormorant Garamond', serif", body: "'Inter', sans-serif" },
      { id: 'neutra', label: 'Neutra', display: "'Inter Tight', sans-serif", body: "'Inter Tight', sans-serif" }]

    },
    initialBlocks: [
    { key: 'hero', type: 'hero' },
    { key: 'text', type: 'text' },
    { key: 'gallery', type: 'gallery' },
    { key: 'collection', type: 'collection' },
    { key: 'links', type: 'links' },
    { key: 'social', type: 'social' }],

    tour: {
      text: 'text.body',
      hero: 'block:hero',
      avatar: 'avatar',
      cta: 'links.cta',
      card: 'collection.0',
      gallery: 'gallery',
      section: 'block:text'
    }
  }
};

export const templateOrder: TemplateId[] = ['bio', 'business', 'portfolio'];