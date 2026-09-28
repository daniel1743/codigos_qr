import { readDirectPageEnvelope } from "../../lib/canonical-page";
import { isPageDocumentV1 } from "../../lib/direct-page-editor/page-document";
import {
  getAliasProfileUrl,
  getPublicPageAliasUrl,
  getPublicPageUrl,
  getPublicProfileUrl,
} from "../../lib/url";

/**
 * F3 — Mi Página / Identity: pure presentation helpers.
 *
 * `profiles` and `pages` are NEVER collapsed: the identity (root BioLink) and the
 * Magic pages keep their own canonical grammar (`/{alias}`, `/p/{public_id}` for the
 * identity; `/pg/{public_id}`, `/pg/a/{alias}` for pages). QR always stays on
 * `/q/{public_id}`. Nothing here mutates data or calls a service.
 */

export const PAGE_TYPE_LABELS: Record<string, string> = {
  landing: "Landing",
  promotion: "Promoción",
  menu: "Menú",
  campaign: "Campaña",
  event: "Evento",
  services: "Servicios",
  catalog: "Catálogo",
  portfolio: "Portafolio",
};

export function pageTypeLabel(pageType: string | null | undefined): string {
  if (!pageType) return "Página";
  return PAGE_TYPE_LABELS[pageType] ?? pageType;
}

export function formatDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

export type CanonicalUrl = { url: string; label: string; isAlias: boolean };

const host = (url: string) => url.replace(/^https?:\/\//, "");

/** Identity (root BioLink) canonical URL: alias when it exists, otherwise `/p/{public_id}`. */
export function resolveIdentityUrl(
  profile: { slug?: string | null; public_id?: string | null } | null,
): CanonicalUrl | null {
  if (!profile) return null;
  const slug = profile.slug?.trim();
  if (slug) {
    const url = getAliasProfileUrl(slug);
    return { url, label: host(url), isAlias: true };
  }
  if (profile.public_id) {
    const url = getPublicProfileUrl(profile.public_id);
    return { url, label: host(url), isAlias: false };
  }
  return null;
}

/**
 * Magic page canonical URL. An unpublished page has NO public URL yet, so the caller
 * receives `null` and renders an honest "publish to get your link" state instead.
 */
export function resolvePageUrl(page: {
  published?: boolean | null;
  slug?: string | null;
  public_id?: string | null;
}): CanonicalUrl | null {
  if (!page.published) return null;
  const slug = page.slug?.trim();
  if (slug) {
    const url = getPublicPageAliasUrl(slug);
    return { url, label: host(url), isAlias: true };
  }
  if (page.public_id) {
    const url = getPublicPageUrl(page.public_id);
    return { url, label: host(url), isAlias: false };
  }
  return null;
}

/**
 * Real count of saved sections for pages persisted with the direct-page document.
 * Returns `null` when the stored envelope uses another shape, so callers omit the
 * datum instead of showing a fabricated number.
 */
export function countPageSections(templateConfig: unknown): number | null {
  const direct = readDirectPageEnvelope(templateConfig);
  if (direct && isPageDocumentV1(direct.editorConfig)) return direct.editorConfig.blocks.length;
  if (isPageDocumentV1(templateConfig)) return templateConfig.blocks.length;
  return null;
}
