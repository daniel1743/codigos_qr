/**
 * CONTENT SOURCE (V2)
 *
 * The Engine decides WHICH blocks exist and HOW they look.
 * It never invents user data: real content is supplied by the host
 * (onboarding, database, or the playground's demo fixtures).
 *
 * Every field is optional. A block is only planned when its content exists.
 */

export interface ContentLinkV2 {
  label: string;
  url: string;
  /** V2: optional description shown by card / media-card presentations. */
  description?: string;
  /** V2: optional thumbnail enabling the 75/25 media-card presentation. */
  imageUrl?: string;
}
export interface ContentSocialV2 {
  platform: string;
  url: string;
}
export interface ContentImageV2 {
  url: string;
  alt?: string;
}
export interface ContentProjectV2 {
  label: string;
  description?: string;
  url: string;
  imageUrl: string;
}
export interface ContentBadgeV2 {
  label: string;
  icon?: string;
}
export interface ContentStatV2 {
  value: string;
  label: string;
  icon?: string;
}
export interface ContentServiceV2 {
  title: string;
  description?: string;
  price?: string;
  icon?: string;
  imageUrl?: string;
}
export interface ContentTestimonialV2 {
  name: string;
  quote: string;
  role?: string;
  source?: string;
  rating?: number;
  avatarUrl?: string;
}
export interface ContentPricingPlanV2 {
  title: string;
  price: string;
  period?: string;
  description?: string;
  features?: string[];
  recommended?: boolean;
  ctaLabel?: string;
  ctaUrl?: string;
}
export interface ContentFaqV2 {
  question: string;
  answer: string;
}
export interface ContentTimelineV2 {
  title: string;
  date?: string;
  description?: string;
  icon?: string;
}
export interface ContentEventV2 {
  title: string;
  date?: string;
  time?: string;
  location?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
}
export interface ContentProductV2 {
  title: string;
  price?: string;
  comparePrice?: string;
  description?: string;
  imageUrl: string;
  ctaLabel?: string;
  ctaUrl?: string;
}
export interface ContentMusicV2 {
  title: string;
  artist?: string;
  coverUrl?: string;
  audioUrl?: string;
}
export interface ContentMapV2 {
  label?: string;
  lat: number;
  lng: number;
}
export interface ContentQuickActionV2 {
  label: string;
  url: string;
  icon?: string;
}

export interface ContentSourceV2 {
  about?: string;
  links?: ContentLinkV2[];
  socials?: ContentSocialV2[];
  featured?: { title: string; subtitle?: string; url: string; imageUrl: string };
  /** A single editorial image; galleries remain the multi-image path. */
  image?: ContentImageV2;
  gallery?: ContentImageV2[];
  portfolio?: ContentProjectV2[];
  video?: { provider: "youtube" | "vimeo"; videoId: string; title?: string };
  mediaCard?: { title: string; body?: string; imageUrl: string; url?: string };
  document?: { title: string; fileName: string; fileSize?: string; url: string };
  contact?: { email?: string; phone?: string; address?: string };
  badges?: ContentBadgeV2[];
  qrUrl?: string;
  /* V2 — unlocked by the frozen Power Editor contract */
  stats?: ContentStatV2[];
  services?: ContentServiceV2[];
  testimonials?: ContentTestimonialV2[];
  pricing?: ContentPricingPlanV2[];
  faq?: ContentFaqV2[];
  timeline?: ContentTimelineV2[];
  events?: ContentEventV2[];
  products?: ContentProductV2[];
  music?: ContentMusicV2;
  map?: ContentMapV2;
  quickActions?: ContentQuickActionV2[];
  bookingUrl?: string;
}

export const EMPTY_CONTENT: ContentSourceV2 = {};

const SAFE_PREFIXES = ["https://", "mailto:", "tel:", "/"];

/** Mirrors the V1 destination policy: no javascript:, no data:, no blob:. */
export function isSafeUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const url = value.trim();
  if (url.length === 0 || url.length > 2048) return false;
  if (url.startsWith("//")) return false;
  return SAFE_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function safeList<T>(value: T[] | undefined, max: number): T[] {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim();
  return clean.length ? clean.slice(0, max) : undefined;
}

/** Drops unusable entries so the planner only sees renderable content. */
export function normalizeContent(source: ContentSourceV2 | undefined): ContentSourceV2 {
  const input = source && typeof source === "object" ? source : {};
  const clean: ContentSourceV2 = {};
  const links = safeList(input.links, 8)
    .filter((l) => l && isSafeUrl(l.url) && !!l.label)
    .map((l) => {
      const item: ContentLinkV2 = { label: l.label, url: l.url };
      const description = text(l.description, 140);
      if (description) item.description = description;
      // Never fabricate an image: only keep a safe one supplied by the host.
      if (isSafeUrl(l.imageUrl)) item.imageUrl = l.imageUrl;
      return item;
    });
  if (links.length) clean.links = links;
  const socials = safeList(input.socials, 6).filter((s) => s && isSafeUrl(s.url) && !!s.platform);
  if (socials.length) clean.socials = socials;
  const gallery = safeList(input.gallery, 9).filter((i) => i && isSafeUrl(i.url));
  if (gallery.length >= 2) clean.gallery = gallery;
  const portfolio = safeList(input.portfolio, 6).filter(
    (p) => p && isSafeUrl(p.url) && isSafeUrl(p.imageUrl),
  );
  if (portfolio.length) clean.portfolio = portfolio;
  const badges = safeList(input.badges, 4).filter((b) => b && !!b.label);
  if (badges.length) clean.badges = badges;
  if (input.featured && isSafeUrl(input.featured.url) && isSafeUrl(input.featured.imageUrl)) {
    clean.featured = input.featured;
  }
  if (input.image && isSafeUrl(input.image.url)) {
    clean.image = { url: input.image.url, ...(input.image.alt ? { alt: input.image.alt } : {}) };
  }
  if (input.video && input.video.videoId) clean.video = input.video;
  if (input.mediaCard && isSafeUrl(input.mediaCard.imageUrl)) clean.mediaCard = input.mediaCard;
  if (input.document && isSafeUrl(input.document.url)) clean.document = input.document;
  if (input.contact && (input.contact.email || input.contact.phone || input.contact.address)) {
    clean.contact = input.contact;
  }
  if (typeof input.about === "string" && input.about.trim().length > 0) {
    clean.about = input.about.trim().slice(0, 320);
  }
  if (isSafeUrl(input.qrUrl)) clean.qrUrl = input.qrUrl;

  /* -------------------------------------------------------------- V2 */
  const stats = safeList(input.stats, 4).filter((s) => s && !!text(s.value, 12) && !!s.label);
  if (stats.length >= 2) clean.stats = stats;

  const services = safeList(input.services, 6).filter((s) => s && !!text(s.title, 60));
  if (services.length) clean.services = services;

  const testimonials = safeList(input.testimonials, 6).filter(
    (t) => t && !!text(t.name, 60) && !!text(t.quote, 280),
  );
  if (testimonials.length) clean.testimonials = testimonials;

  const pricing = safeList(input.pricing, 4).filter(
    (p) => p && !!text(p.title, 40) && !!text(p.price, 24),
  );
  if (pricing.length) clean.pricing = pricing;

  const faq = safeList(input.faq, 8).filter((f) => f && !!text(f.question, 160) && !!text(f.answer, 600));
  if (faq.length) clean.faq = faq;

  const timeline = safeList(input.timeline, 8).filter((t) => t && !!text(t.title, 80));
  if (timeline.length >= 2) clean.timeline = timeline;

  const events = safeList(input.events, 6).filter((e) => e && !!text(e.title, 80));
  if (events.length) clean.events = events;

  const products = safeList(input.products, 8).filter((p) => p && !!text(p.title, 80) && isSafeUrl(p.imageUrl));
  if (products.length) clean.products = products;

  if (input.music && text(input.music.title, 80)) clean.music = input.music;

  if (
    input.map &&
    typeof input.map.lat === "number" &&
    typeof input.map.lng === "number" &&
    Number.isFinite(input.map.lat) &&
    Number.isFinite(input.map.lng)
  ) {
    clean.map = input.map;
  }

  const quickActions = safeList(input.quickActions, 3).filter(
    (a) => a && !!text(a.label, 40) && isSafeUrl(a.url),
  );
  if (quickActions.length) clean.quickActions = quickActions;

  if (isSafeUrl(input.bookingUrl)) clean.bookingUrl = input.bookingUrl;

  return clean;
}
