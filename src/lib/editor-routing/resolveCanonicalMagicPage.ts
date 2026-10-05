import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * C3.2.1 — Landing ↔ full catalog navigation.
 *
 * The owner's MAIN page (landing) is a `pages` row. The complete catalog
 * (C3/C3.2) is a CHILD/EXTENSION created from a landing block: it lives as its
 * own `pages` row with `page_type = "catalog"`. It must never BE the landing.
 * C3.2 started routing "Administrar catálogo" into the catalog editor
 * (`/pages/{id}/catalog`), so from then on the catalog row can become the most
 * recently updated page — which used to leak into the global "Editar página"
 * action and the shell's primary page. This resolver keeps every navigation that
 * means "the landing" pointing at the landing, never at the catalog.
 */

/** Any owned page row that can be resolved as the landing. */
export interface LandingPageCandidate {
  id: string;
  page_type?: string | null;
}

/**
 * Child page types that are EXTENSIONS of a landing and can therefore never be
 * the landing itself. Only the catalog is listed: it is the exact page the
 * global navigation used to leak into after C3.2.
 */
const LANDING_EXCLUDED_TYPES: ReadonlySet<string> = new Set(["catalog"]);

/**
 * Pick the landing page from the owner's rows, preserving the caller's order.
 *
 * 1. The first `page_type = "landing"` row wins (the real page).
 * 2. Otherwise the first row that is not an extension (e.g. promotion/menu/...).
 * 3. A catalog-only account resolves to `null` — never to the catalog.
 */
export function selectLandingPage<T extends LandingPageCandidate>(
  pages: readonly T[],
): T | null {
  if (pages.length === 0) return null;
  const landing = pages.find((page) => page.page_type === "landing");
  if (landing) return landing;
  return pages.find((page) => !LANDING_EXCLUDED_TYPES.has(page.page_type ?? "")) ?? null;
}

export async function resolveCanonicalMagicPageId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("pages")
    .select("id, page_type")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return selectLandingPage(data ?? [])?.id ?? null;
}

export function buildCanonicalMagicEditorUrl(pageId: string): string {
  return `/pages/${pageId}/edit`;
}
