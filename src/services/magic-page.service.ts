import type { SupabaseClient } from "@supabase/supabase-js";
import type { Page } from "../types/database";
import {
  createInitialMagicPageDocument,
  isMagicPageDocument,
  validateMagicPageDocumentV1,
  type MagicPageDocumentV1,
} from "../features/magic-page-editor-production/magic-document";
import type { PageType } from "../types/database";
import type { TemplateId } from "../isolated/magic-page-editor/types/editor";

/**
 * G7 — conflicto de guardado atómico.
 *
 * Se lanza cuando el RPC `save_page_magic_draft` encuentra que el documento
 * cambió entre la lectura y la escritura (compare-and-set fallido). Es una
 * subclase de `Error`, así que cualquier `catch` existente sigue funcionando;
 * solo permite distinguir "otra sesión guardó antes" de un fallo cualquiera.
 */
export class PageDraftConflictError extends Error {
  constructor(
    message = "La tarjeta cambió en otra sesión. Tu diseño sigue guardado en este navegador.",
  ) {
    super(message);
    this.name = "PageDraftConflictError";
  }
}

/** Señal estable emitida por el RPC (el token va dentro del mensaje). */
export function isDraftConflict(error: unknown): boolean {
  if (error instanceof PageDraftConflictError) return true;
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" && message.includes("DRAFT_CONFLICT");
}

export const magicPageService = {
  async getPrimaryPage(supabase: SupabaseClient, userId: string): Promise<Page | null> {
    const { data, error } = await supabase
      .from("pages")
      .select("*")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as Page | null;
  },

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
      throw new Error(
        "La página no existe, no pertenece al usuario o devolvió un documento Magic inválido.",
      );
    }
    return data.template_config;
  },

  /**
   * G7 — guardado ATÓMICO del borrador (compare-and-set).
   *
   * Escribe `template_config` **solo si** sigue siendo exactamente el documento que
   * el llamante leyó (`expectedDocument`), y la comparación ocurre en la MISMA
   * sentencia que escribe (RPC `save_page_magic_draft`). Así desaparece la ventana
   * *check-then-write* de `saveDraft`: ya no puede perderse una escritura ajena.
   *
   * Notas de contrato:
   *   - `saveDraft` se conserva **intacto**: esto es opt-in, ningún consumidor
   *     actual cambia de comportamiento.
   *   - El dueño lo determina la sesión (`auth.uid()`) dentro del RPC: este método
   *     NO acepta un `userId` del cliente, no hay nada que suplantar.
   *   - Un conflicto se señala con `PageDraftConflictError` (subclase de `Error`).
   */
  async saveDraftIfUnchanged(
    supabase: SupabaseClient,
    pageId: string,
    document: unknown,
    expectedDocument: unknown,
  ): Promise<MagicPageDocumentV1> {
    const valid = validateMagicPageDocumentV1(document);
    const { data, error } = await supabase.rpc("save_page_magic_draft", {
      p_page_id: pageId,
      p_expected: (expectedDocument ?? null) as never,
      p_document: valid as never,
    });
    if (error) {
      if (isDraftConflict(error)) throw new PageDraftConflictError();
      throw error;
    }

    const row = (Array.isArray(data) ? data[0] : data) as { template_config?: unknown } | null;
    const saved = row?.template_config;
    if (!isMagicPageDocument(saved)) {
      throw new Error(
        "La página no existe, no pertenece al usuario o devolvió un documento Magic inválido.",
      );
    }
    return saved;
  },

  /**
   * Make sure an owned page carries the canonical Magic starter document.
   *
   * Idempotent and safe to retry: an already-valid Magic document is NEVER
   * overwritten, so a resumed first-page attempt repairs a page whose starter
   * write failed instead of clobbering real content or leaving an orphan page.
   */
  async ensureInitialMagicDocument(
    supabase: SupabaseClient,
    pageId: string,
    userId: string,
    templateId: TemplateId = "bio",
  ): Promise<MagicPageDocumentV1> {
    const owned = await this.getOwnedPage(supabase, pageId, userId);
    if (!owned) {
      throw new Error("La página no existe o no pertenece al usuario autenticado.");
    }
    if (isMagicPageDocument(owned.template_config)) {
      return owned.template_config;
    }
    return this.saveDraft(supabase, pageId, userId, createInitialMagicPageDocument(templateId));
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
    if (!data)
      throw new Error(
        "No se pudo publicar: la página cambió en otra sesión. Recarga e inténtalo de nuevo.",
      );
    return data as Page;
  },
};
