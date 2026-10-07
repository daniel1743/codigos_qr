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
  if (!packed && !name && !cta && !type) return base;
  return {
    ...base,
    name: name ?? base.name,
    tagline: packed ? base.tagline : type?.tagline ?? base.tagline,
    cta: cta ?? base.cta
  };
}