import { env } from "./env";

/**
 * Generates the public URL for a given profile slug.
 */
export function getPublicProfileUrl(slug: string): string {
  // Ensure no trailing slash on appUrl and no leading slash on slug
  const baseUrl = env.appUrl.replace(/\/$/, "");
  const cleanSlug = slug.replace(/^\//, "");

  return `${baseUrl}/p/${cleanSlug}`;
}
