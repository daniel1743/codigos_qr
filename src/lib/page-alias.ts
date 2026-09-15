/**
 * PAGES_6 — Per-page custom alias (human-friendly public link).
 *
 * The alias lives in a DEDICATED namespace (`/pg/a/{slug}`) so it can never
 * collide with the primary profile root alias (`/{slug}`), the stable page
 * identity (`/pg/{public_id}`), or the stable profile identity (`/p/{public_id}`).
 *
 * Alias is NOT canonical identity: normalizing or changing it never touches
 * `public_id`, the QR destination, the canonical document, or `published_revision`.
 */

/** Route namespace segment that prefixes a page alias. */
export const PAGE_ALIAS_PATH_PREFIX = "/pg/a";

/**
 * Names derived from the actual top-level router so a page alias can never
 * shadow (or be confused with) a real system route.
 */
export const RESERVED_PAGE_ALIASES: ReadonlySet<string> = new Set([
  "a", // the alias namespace literal segment itself
  "p",
  "pg",
  "page",
  "pages",
  "editor",
  "qr",
  "profile",
  "account",
  "admin",
  "api",
  "assets",
  "auth",
  "login",
  "signup",
  "settings",
  "terms",
  "privacy",
  "help",
  "support",
  "d",
  "vs",
  "internal",
  "sitemap",
  "plataforma",
  "power-editor",
  "template-lab",
  "onboarding-preview",
  "encrypted-documents",
  "engine-lab",
  "power-editor-phase4-qa",
]);

/** Max length for a page alias (keeps URLs readable and avoids abuse). */
export const PAGE_ALIAS_MAX_LENGTH = 60;

/**
 * Normalize a raw user input into a valid page alias:
 * lowercase → strip diacritics → non [a-z0-9] runs become "-" → collapse
 * repeated hyphens → strip leading/trailing hyphens.
 *
 * @example normalizePageAlias("Promo Septiembre 2026!") === "promo-septiembre-2026"
 */
export function normalizePageAlias(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** True when the alias is a reserved system route segment. */
export function isReservedPageAlias(alias: string): boolean {
  return RESERVED_PAGE_ALIASES.has(alias);
}

/**
 * True when the (already normalized) alias is a valid, non-reserved page alias.
 * Accepts `a-z0-9` with single interior hyphens and no leading/trailing hyphen.
 */
export function isValidPageAlias(alias: string): boolean {
  if (!alias) return false;
  if (alias.length > PAGE_ALIAS_MAX_LENGTH) return false;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(alias)) return false;
  if (isReservedPageAlias(alias)) return false;
  return true;
}
