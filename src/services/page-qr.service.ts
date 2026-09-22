import type { SupabaseClient } from "@supabase/supabase-js";
import type { PageQrConfig } from "../types/database";

/**
 * PAGES_5 — Per-page QR persistence.
 *
 * Writes ONLY to `public.pages.qr_config`. Never touches `profiles` or any
 * `profiles.qr_*` column, never touches canonical page fields
 * (template_config / published_template_config / published_revision).
 *
 * Ownership is enforced twice: at the query level (`.eq("owner_user_id", userId)`)
 * and by the existing `owner_update_page` / `owner_select_page` RLS policies.
 */
export const pageQrService = {
  async getQrConfig(
    supabase: SupabaseClient,
    pageId: string,
    userId: string,
  ): Promise<PageQrConfig | null> {
    const { data, error } = await supabase
      .from("pages")
      .select("qr_config")
      .eq("id", pageId)
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return (data.qr_config as PageQrConfig | null) ?? null;
  },

  async saveQrConfig(
    supabase: SupabaseClient,
    pageId: string,
    userId: string,
    config: PageQrConfig,
  ): Promise<void> {
    const { data, error } = await supabase
      .from("pages")
      .update({ qr_config: config })
      .eq("id", pageId)
      .eq("owner_user_id", userId)
      .select("qr_config")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error("Página inexistente o no pertenece al usuario autenticado.");
    }
  },
};
