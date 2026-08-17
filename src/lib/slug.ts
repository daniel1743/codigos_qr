const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "login",
  "signup",
  "editor",
  "dashboard",
  "settings",
  "p",
]);

/**
 * Normaliza un texto para ser usado como slug en un perfil.
 *
 * Reglas:
 * - Convierte a minúsculas
 * - Reemplaza espacios con guiones
 * - Elimina caracteres especiales
 * - Elimina guiones consecutivos y en los extremos
 * - Bloquea palabras reservadas
 */
export function normalizeSlug(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error("Slug cannot be empty after normalization.");
  }

  if (RESERVED_SLUGS.has(slug)) {
    throw new Error(`The slug "${slug}" is reserved and cannot be used.`);
  }

  return slug;
}
