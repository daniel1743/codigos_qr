import type { SupabaseClient } from "@supabase/supabase-js";
import type { Page } from "../types/database";
import {
  createInitialMagicPageDocument,
  isMagicPageDocument,
  validateMagicPageDocumentV1,
  type MagicPageDocumentV1,
} from "../features/magic-page-editor-production/magic-document";
import type { PageType } from "../types/database";

export const magicPageService = {
  async createPage(
    supabase: SupabaseClient,
    input: { userId: string; profileId: string; title: string; pageType: PageType },
  ): Promise<Page> {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", input.profileId)
      .eq("user_id", input.userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) throw new Error("El perfil seleccionado no pertenece al usuario autenticado.");

    const { data: page, error } = await supabase
      .from("pages")
      .insert({
        owner_user_id: input.userId,
        profile_id: input.profileId,
        title: input.title.trim() || "Mi página",
        page_type: input.pageType,
        template_config: createInitialMagicPageDocument("bio"),
        published_template_config: null,
        published: false,
        published_revision: 0,
        published_at: null,
        slug: null,
      })
      .select()
      .single();
    if (error) throw error;
    return page as Page;
  },

  async getOwnedPage(
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
    return data as Page | null;
  },

  async saveDraft(
    supabase: SupabaseClient,
    pageId: string,
    userId: string,
    document: unknown,
  ): Promise<MagicPageDocumentV1> {
    const valid = validateMagicPageDocumentV1(document);
    const { data, error } = await supabase
      .from("pages")
      .update({ template_config: valid })
      .eq("id", pageId)
      .eq("owner_user_id", userId)
      .select("template_config")
      .maybeSingle();
    if (error) throw error;
    if (!data || !isMagicPageDocument(data.template_config)) {
      throw new Error("La página no existe, no pertenece al usuario o devolvió un documento Magic inválido.");
    }
    return data.template_config;
  },

  async publish(
    supabase: SupabaseClient,
    pageId: string,
    userId: string,
    document: unknown,
    expectedRevision: number,
  ): Promise<Page> {
    const valid = validateMagicPageDocumentV1(document);
    const { data, error } = await supabase
      .from("pages")
      .update({
        published_template_config: valid,
        published: true,
        published_revision: expectedRevision + 1,
        published_at: new Date().toISOString(),
      })
      .eq("id", pageId)
      .eq("owner_user_id", userId)
      .eq("published_revision", expectedRevision)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("No se pudo publicar: la página cambió en otra sesión. Recarga e inténtalo de nuevo.");
    return data as Page;
  },
};
