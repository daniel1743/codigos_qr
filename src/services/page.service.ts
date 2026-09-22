import type { SupabaseClient } from "@supabase/supabase-js";
import type { Page, PageInsert, PageType } from "../types/database";

/**
 * The only page types the `pages` table (and this service) accepts.
 *
 * PAGES_7 extended the canonical contract with the three product experiences
 * that the Page Generator can create ("services", "catalog", "portfolio").
 * Existing types are preserved unchanged.
 */
export const ALLOWED_PAGE_TYPES: readonly PageType[] = [
  "landing",
  "promotion",
  "menu",
  "campaign",
  "event",
  "services",
  "catalog",
  "portfolio",
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
 * The public rendering contract returned by `get_public_page_by_public_id`.
 *
 * This is a narrow projection — owner-only fields (`owner_user_id`,
 * `profile_id`), the draft `template_config`, `published`, `published_revision`
 * and creation/update timestamps are deliberately absent from the public
 * document. `published_template_config` is the ONLY canonical source passed
 * into the public renderer.
 */
export interface PublicPageResult {
  page_id: string;
  public_id: string;
  title: string | null;
  page_type: string | null;
  published_template_config: unknown;
  slug: string | null;
  published_at: string | null;
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
   * Permanently delete one owned child Page.
   *
   * The page table is the child-page authority; the primary profile is never
   * represented by a `pages` row. We still verify the owning profile before
   * issuing the delete, while the database `owner_delete_page` RLS policy is
   * the final server-side authority for the authenticated user.
   *
   * `slug` and `qr_config` are page-owned columns, so deleting the authoritative
   * row also removes the page alias and page QR relationship. No profile row or
   * profile QR state is touched.
   */
  async deleteOwnedChildPage(
    supabase: SupabaseClient,
    pageId: string,
    userId: string,
  ): Promise<void> {
    if (!pageId || !userId) {
      throw new PageServiceError("Se requiere una sesión autenticada y una página válida.");
    }

    const page = await pageService.getOwnPageById(supabase, pageId, userId);
    if (!page) {
      throw new PageServiceError("La página no existe o no te pertenece.");
    }

    // A primary profile has no row in `public.pages`. Keep this explicit guard
    // so a malformed/legacy row can never be treated as the profile itself.
    if (page.id === page.profile_id) {
      throw new PageServiceError("La página principal no se puede eliminar.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", page.profile_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      throw new PageServiceError("El perfil de esta página no existe o no te pertenece.");
    }

    const { data: deleted, error } = await supabase
      .from("pages")
      .delete()
      .eq("id", page.id)
      .eq("owner_user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!deleted) {
      throw new PageServiceError("La página no existe o no pudo eliminarse.");
    }
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

    const { data, error } = await supabase.from("pages").insert(payload).select().single();

    if (error) throw error;
    return data;
  },

  /**
   * Resolve one PUBLISHED child page by its public_id through the safe public
   * RPC (`get_public_page_by_public_id`).
   *
   * This is the ONLY public read path for `public.pages`: it never does a
   * direct anon `SELECT` against the table, and it never exposes or falls back
   * to the draft `template_config` — the RPC returns `published_template_config`
   * only, and only for rows that are `published = TRUE`.
   */
  async getPublicPageByPublicId(
    supabase: SupabaseClient,
    publicId: string,
  ): Promise<PublicPageResult | null> {
    const { data, error } = await supabase.rpc("get_public_page_by_public_id", {
      p_public_id: publicId,
    });

    if (error) throw error;

    // The RPC is `RETURNS TABLE (...)`, so PostgREST responds with an array of
    // rows — empty when the page is missing, unpublished, or has no published
    // config. We never synthesize a result from draft data.
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    if (rows.length === 0) return null;

    return rows[0] as PublicPageResult;
  },
};
