import { env } from "./env";

export const CANONICAL_PUBLIC_ORIGIN = "https://www.cripqer.dev";

/**
 * Generates the public URL for a given immutable profile public id.
 */
export function getPublicProfileUrl(publicId: string): string {
  // Siempre usar el origin canónico (cripqer.dev) en lugar del vercel/local domain.
  const appUrl = CANONICAL_PUBLIC_ORIGIN;

  // Ensure no trailing slash on appUrl and no leading slash on publicId
  const baseUrl = appUrl.replace(/\/$/, "");
  const cleanPublicId = publicId.replace(/^\//, "");

  return `${baseUrl}/p/${cleanPublicId}`;
}

export function getAliasProfileUrl(slug: string): string {
  const appUrl = CANONICAL_PUBLIC_ORIGIN;
  const baseUrl = appUrl.replace(/\/$/, "");
  const cleanSlug = slug.replace(/^\//, "");
  return `${baseUrl}/${cleanSlug}`;
}

/**
 * Generates the public URL for a child Page from its immutable `public_id`.
 *
 * Child Pages live under `/pg/{public_id}` (PAGES_4A/4B). The QR destination
 * MUST use the stable public_id — never the title, never a fabricated alias,
 * never the slug (alias belongs to PAGES_6).
 */
export function getPublicPageUrl(publicId: string): string {
  const baseUrl = CANONICAL_PUBLIC_ORIGIN.replace(/\/$/, "");
  const cleanPublicId = publicId.replace(/^\//, "");
  return `${baseUrl}/pg/${cleanPublicId}`;
}

/**
 * Generates the public custom-alias URL for a child Page.
 *
 * The alias lives in a dedicated namespace (`/pg/a/{alias}`) so it never
 * collides with the primary profile root alias (`/{slug}`) or the stable page
 * identity (`/pg/{public_id}`). This URL is convenience-only — the QR always
 * points to the stable `/pg/{public_id}` URL.
 */
export function getPublicPageAliasUrl(alias: string): string {
  const baseUrl = CANONICAL_PUBLIC_ORIGIN.replace(/\/$/, "");
  const cleanAlias = alias.replace(/^\/+/, "");
  return `${baseUrl}/pg/a/${cleanAlias}`;
}
