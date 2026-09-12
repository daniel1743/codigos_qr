import type { SupabaseClient } from "@supabase/supabase-js";
import type { Page, PageInsert, PageType } from "../types/database";

/** The only page types the `pages` table (and this service) accepts. */
export const ALLOWED_PAGE_TYPES: readonly PageType[] = [
  "landing",
  "promotion",
  "menu",
  "campaign",
  "event",
];

function isAllowedPageType(value: unknown): value is PageType {
  return ALLOWED_PAGE_TYPES.includes(value as PageType);
}

/** Error thrown for validation/authorization failures in the page service. */
export class PageServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PageServiceError";
  }
}

/**
 * Pages MANAGEMENT FOUNDATION.
 *
 * This service owns the `public.pages` child-page table only. It deliberately
 * never touches `profiles`, never represents the primary profile page as a
 * `pages` row, and does not implement delete / duplicate / archive / publish /
 * QR / alias (those belong to later PAGES_* tasks).
 */
export const pageService = {
  /**
   * List child pages owned by the authenticated user, optionally scoped to the
   * active profile.
   */
  async listOwnPages(
    supabase: SupabaseClient,
    userId: string,
    profileId?: string,
  ): Promise<Page[]> {
    let query = supabase
      .from("pages")
      .select("*")
      .eq("owner_user_id", userId)
      .order("updated_at", { ascending: false });

    if (profileId) {
      query = query.eq("profile_id", profileId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Return a page only when its owner matches the authenticated user.
   */
  async getOwnPageById(
    supabase: SupabaseClient,
    pageId: string,
    userId: string,
  ): Promise<Page | null> {
    const { data, error } = await supabase
      .from("pages")
      .select("*")
      .eq("id", pageId)
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Create a child page. `owner_user_id` is ALWAYS taken from the authenticated
   * session (`input.userId`), never from UI input. The database generates
   * `id`, `public_id`, `created_at` and `updated_at`.
   */
  async createPage(
    supabase: SupabaseClient,
    input: {
      userId: string;
      profileId: string;
      title: string;
      pageType: PageType;
    },
  ): Promise<Page> {
    const title = input.title.trim();
    if (!title) {
      throw new PageServiceError("El nombre de la página es obligatorio.");
    }

    if (!isAllowedPageType(input.pageType)) {
      throw new PageServiceError("El objetivo seleccionado no es válido.");
    }

    if (!input.userId) {
      throw new PageServiceError("Se requiere una sesión autenticada.");
    }

    // Verify the referenced profile exists AND belongs to the authenticated user.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", input.profileId)
      .eq("user_id", input.userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      throw new PageServiceError("El perfil no existe o no te pertenece.");
    }

    const payload: PageInsert = {
      owner_user_id: input.userId,
      profile_id: input.profileId,
      title,
      page_type: input.pageType,
      template_config: null,
      published_template_config: null,
      published: false,
      published_revision: 0,
      published_at: null,
      slug: null,
    };

    const { data, error } = await supabase
      .from("pages")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
