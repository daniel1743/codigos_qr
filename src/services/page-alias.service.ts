import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicPageResult } from "./page.service";

/**
 * PAGES_6 — Per-page custom alias service.
 *
 * Writes ONLY `public.pages.slug`. Never touches `public_id`, `template_config`,
 * `published_template_config`, `published_revision`, `qr_config`, `title`, or
 * `page_type`. Ownership is enforced twice: at the query level
 * (`.eq("owner_user_id", userId)`) and by the existing `owner_update_page`
 * RLS policy.
 *
 * Global uniqueness is enforced by the existing `idx_pages_slug_unique` partial
 * unique index (not by this service or the UI).
 */
export const pageAliasService = {
  /**
   * Set (or clear) a page alias for the owner. Pass `null` to remove the alias.
   * Throws if the page does not exist or does not belong to the user.
   */
  async savePageAlias(
    supabase: SupabaseClient,
    pageId: string,
    userId: string,
    alias: string | null,
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from("pages")
      .update({ slug: alias })
      .eq("id", pageId)
      .eq("owner_user_id", userId)
      .select("slug")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error("Página inexistente o no pertenece al usuario autenticado.");
    }
    return data.slug as string | null;
  },

  /**
   * True when no OTHER page currently owns this alias (owner-only UX check).
   * The unique index remains the real enforcement against races.
   */
  async isAliasAvailable(
    supabase: SupabaseClient,
    alias: string,
    excludePageId: string,
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from("pages")
      .select("id")
      .eq("slug", alias)
      .neq("id", excludePageId)
      .maybeSingle();

    if (error) throw error;
    return data == null;
  },

  /**
   * Resolve one PUBLISHED child page by its custom alias through the safe public
   * RPC (`get_public_page_by_slug`). Never falls back to draft data, never reads
   * owner-only fields, and only returns published pages with a published config.
   */
  async getPublicPageByAlias(
    supabase: SupabaseClient,
    alias: string,
  ): Promise<PublicPageResult | null> {
    const { data, error } = await supabase.rpc("get_public_page_by_slug", {
      p_slug: alias,
    });

    if (error) throw error;

    const rows = Array.isArray(data) ? data : data ? [data] : [];
    if (rows.length === 0) return null;
    return rows[0] as PublicPageResult;
  },
};
