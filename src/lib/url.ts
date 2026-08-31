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
