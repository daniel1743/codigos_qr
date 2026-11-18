import { templates } from '../data/templates';
import { contentPacks } from '../data/contentPacks';
import { businessTypes, channels } from '../data/business';
import type { BusinessContext, ContentPack, PageContent, TemplateFamily, TemplateId } from '../types/cripqer';

export function getTemplate(id: TemplateId): TemplateFamily {
  return templates.find((t) => t.id === id) ?? templates[0]!;
}

export function getPack(id: string): ContentPack {
  return contentPacks.find((p) => p.id === id) ?? contentPacks[0]!;
}

export function hasPack(id: string | null): boolean {
  return id ? contentPacks.some((p) => p.id === id) : false;
}

export function getBusinessType(id: string | null) {
  return id ? businessTypes.find((b) => b.id === id) ?? null : null;
}

export function getChannel(id: string | null) {
  return id ? channels.find((c) => c.id === id) ?? null : null;
}

/** Family demo content, or a business pack adapted to this family (content only). */
export function contentForPack(tpl: TemplateFamily, packId?: string | null): PageContent {
  const pack = getPack(packId ?? tpl.packId);
  return { ...pack.content, ...(pack.familyOverrides?.[tpl.id] ?? {}) };
}

function ctaFor(ctx: BusinessContext): string | null {
  const channel = getChannel(ctx.primaryChannel);
  if (!channel) return null;
  if (channel.id === 'whatsapp') {
    if (ctx.primaryGoal === 'reservations' || ctx.primaryGoal === 'bookings') return 'Reservar por WhatsApp';
    if (ctx.primaryGoal === 'appointments') return 'Agendar por WhatsApp';
    if (ctx.primaryGoal === 'orders') return 'Pedir por WhatsApp';
  }
  return channel.cta;
}

/**
 * An unknown activity must never inherit another profession's demo copy.
 * Keep the selected family's visual language and replace only the content
 * with neutral, explicitly editable placeholders.
 */
function neutralContent(base: PageContent, ctx: BusinessContext): PageContent {
  const name = ctx.businessIdentity.name ?? 'Tu proyecto';
  return {
    ...base,
    name,
    role: 'Presencia digital',
    eyebrow: 'Ejemplo editable',
    tagline: 'Presenta lo que haces con claridad.',
    about: 'Personaliza este espacio con tu propuesta, tus servicios, tus productos o tu portafolio.',
    cta: 'Contactarme',
    services: base.services.slice(0, 3).map((service, index) => ({
      ...service,
      title: ['Tu propuesta', 'Tu servicio', 'Tu contenido'][index] ?? 'Tu contenido',
      detail: 'Personalizable en el editor',
      price: 'A definir'
    })),
    reviews: base.reviews.slice(0, 2).map((review, index) => ({
      ...review,
      quote: 'Opinión de ejemplo: reemplázala con una experiencia real.',
      author: `Ejemplo ${index + 1}`
    })),
    links: ['Conoce mi trabajo', 'Ver mi propuesta', 'Contactarme'],
    imageCards: base.imageCards.slice(0, 3).map((card, index) => ({
      ...card,
      title: `Contenido ${index + 1}`,
      detail: 'Añade aquí tu material'
    })),
    location: { address: 'Añade tu ubicación', hours: 'Añade tu horario' },
    social: ['Instagram', 'WhatsApp'],
    videoTitle: 'Añade tu presentación'
  };
}

/**
 * Template Family + Business Context → replaceable content.
 * The family's visual grammar (hero, sections, palette, type) never changes here.
 */
export function resolveContent(tpl: TemplateFamily, ctx?: BusinessContext): PageContent {
  if (!ctx) return contentForPack(tpl);
  const typeId = ctx.businessIdentity.type;
  const packed = hasPack(typeId);
  const base = contentForPack(tpl, packed ? typeId : null);
  const type = getBusinessType(typeId);
  const name = ctx.businessIdentity.name;
  const cta = ctaFor(ctx);
  if (!packed && typeId) {
    return {
      ...neutralContent(base, ctx),
      cta: cta ?? 'Contactarme'
    };
  }
  if (!packed && !name && !cta && !type) return base;
  return {
    ...base,
    name: name ?? base.name,
    tagline: packed ? base.tagline : type?.tagline ?? base.tagline,
    cta: cta ?? base.cta
  };
}
