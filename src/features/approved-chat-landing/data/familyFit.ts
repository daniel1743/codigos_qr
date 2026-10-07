import type { TemplateId } from '../types/cripqer';

/**
 * Recommendation metadata for each visual family.
 * A family is a visual system, not an industry: `strongFor` lists business types
 * (ids from data/business.ts) it adapts to especially well, in order of fit.
 * Goals use ids from `goals`. `reason` is the short, user-facing justification.
 */
export interface FamilyFit {
  personality: string[];
  strongFor: string[];
  strongGoals: string[];
  strongContent: string[];
  reason: string;
}

export const familyFit: Record<TemplateId, FamilyFit> = {
  warm_care: {
    personality: ['cálida', 'humana', 'confiable', 'cercana'],
    strongFor: ['pets', 'professional', 'local', 'other'],
    strongGoals: ['leads', 'appointments'],
    strongContent: ['portrait', 'services', 'reviews', 'whatsapp', 'contact'],
    reason: 'Transmite confianza y cercanía desde el primer vistazo.'
  },
  dark_craft: {
    personality: ['audaz', 'oscura', 'editorial', 'premium'],
    strongFor: ['barbershop', 'artist', 'restaurant'],
    strongGoals: ['bookings', 'showcase'],
    strongContent: ['photography', 'services', 'imageCards', 'reviews', 'instagram'],
    reason: 'Carácter fuerte y fotografía protagonista.'
  },
  soft_beauty: {
    personality: ['suave', 'elegante', 'refinada', 'serena'],
    strongFor: ['beauty', 'jewelry'],
    strongGoals: ['bookings', 'appointments', 'leads'],
    strongContent: ['portrait', 'services', 'reviews', 'gallery', 'whatsapp'],
    reason: 'Suave y aspiracional, ideal para servicios de cuidado.'
  },
  food_story: {
    personality: ['apetitosa', 'visual', 'cálida', 'editorial'],
    strongFor: ['restaurant', 'bakery', 'store'],
    strongGoals: ['orders', 'reservations', 'visits'],
    strongContent: ['food_photography', 'menu', 'gallery', 'location', 'whatsapp'],
    reason: 'Deja que tus productos se vean irresistibles.'
  },
  professional_trust: {
    personality: ['profesional', 'confiable', 'estructurada', 'clara'],
    strongFor: ['professional', 'real_estate', 'personal', 'other'],
    strongGoals: ['leads', 'appointments'],
    strongContent: ['portrait', 'services', 'reviews', 'contact', 'whatsapp'],
    reason: 'Autoridad y confianza para generar contactos.'
  },
  personal_brand: {
    personality: ['humana', 'moderna', 'segura', 'personal'],
    strongFor: ['personal', 'professional', 'artist', 'other'],
    strongGoals: ['leads', 'sales'],
    strongContent: ['portrait', 'text', 'links', 'video', 'social'],
    reason: 'Tú eres el protagonista: cercana y segura.'
  },
  product_spotlight: {
    personality: ['comercial', 'visual', 'limpia'],
    strongFor: ['store', 'bakery', 'jewelry'],
    strongGoals: ['sales', 'orders'],
    strongContent: ['product_images', 'imageCards', 'cta', 'whatsapp'],
    reason: 'Pone tus productos al frente y facilita pedir.'
  },
  minimal_premium: {
    personality: ['minimal', 'arquitectónica', 'refinada', 'premium'],
    strongFor: ['studio', 'real_estate', 'professional', 'jewelry', 'barbershop'],
    strongGoals: ['showcase', 'leads'],
    strongContent: ['photography', 'text', 'gallery', 'contact'],
    reason: 'Posicionamiento premium con mucho aire.'
  },
  bold_creative: {
    personality: ['expresiva', 'artística', 'enérgica'],
    strongFor: ['artist', 'photographer', 'personal'],
    strongGoals: ['showcase', 'leads'],
    strongContent: ['gallery', 'imageCards', 'social', 'cta'],
    reason: 'Expresiva y fuera de lo común.'
  },
  local_friendly: {
    personality: ['cercana', 'de barrio', 'práctica', 'confiable'],
    strongFor: ['local', 'bakery', 'restaurant', 'store', 'pets', 'other'],
    strongGoals: ['visits', 'orders', 'leads'],
    strongContent: ['local_photography', 'services', 'location', 'reviews', 'whatsapp'],
    reason: 'Cercana y fácil de encontrar para tus clientes.'
  },
  editorial_luxury: {
    personality: ['lujosa', 'editorial', 'sofisticada'],
    strongFor: ['jewelry', 'beauty', 'store'],
    strongGoals: ['sales', 'leads'],
    strongContent: ['premium_photography', 'products', 'gallery', 'cta'],
    reason: 'Editorial y de lujo, para productos premium.'
  },
  visual_portfolio: {
    personality: ['visual', 'limpia', 'de portafolio'],
    strongFor: ['photographer', 'studio', 'artist', 'real_estate'],
    strongGoals: ['showcase', 'leads'],
    strongContent: ['gallery', 'projects', 'reviews', 'contact'],
    reason: 'Tus imágenes primero, como una galería.'
  }
};