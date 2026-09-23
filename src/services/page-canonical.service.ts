import type { SupabaseClient } from "@supabase/supabase-js";
import { validateTemplate } from "../premium-template-studio/engine/TemplateValidator";
import {
  acceptEngineGeneratedConfig,
  createDirectPageEnvelope,
  readCanonicalPageEnvelope,
  readDirectPageEnvelope,
  type CanonicalPageEnvelopeV1,
} from "../lib/canonical-page";
import { isPageDocumentV1, type PageDocumentV1 } from "../lib/direct-page-editor/page-document";
import type { Page } from "../types/database";

function assertValidEditorConfig(editorConfig: unknown): void {
  const validation = validateTemplate(editorConfig);
  if (!validation.valid) {
    const first = validation.issues.find((issue) => issue.level === "error");
    throw new Error(
      `El editorConfig no es válido: ${first?.path ?? "config"} — ${first?.message ?? "error desconocido"}.`,
    );
  }
}

function isDirectDocument(value: unknown): value is PageDocumentV1 {
  return isPageDocumentV1(value);
}

/**
 * CHILD PAGE CANONICAL PERSISTENCE.
 *
 * This is the `public.pages` authority. It writes ONLY to the `pages` table —
 * never to `profiles`, never to the profile canonical RPCs
 * (`set_profile_canonical_editor_config`, `publish_profile_canonical_snapshot`).
 *
 * Every write is RLS-enforced (`owner_update_page` requires `auth.uid() =
 * owner_user_id`), validated before write, and scoped to a single owned row.
 */
export const pageCanonicalService = {
  /**
   * Persist the current Power Studio canonical snapshot as the page draft.
   * Only `template_config` is updated; `public_id`, `slug`, `published_*` and
   * QR fields are never touched.
   */
  async saveDraft(
    supabase: SupabaseClient,
    pageId: string,
    userId: string,
    editorConfig: unknown,
  ): Promise<CanonicalPageEnvelopeV1> {
    const direct = isDirectDocument(editorConfig);
    const envelope = direct ? createDirectPageEnvelope(editorConfig) : acceptEngineGeneratedConfig(editorConfig);
    if (!direct) assertValidEditorConfig(envelope.editorConfig);

    const { data, error } = await supabase
      .from("pages")
      .update({ template_config: envelope })
      .eq("id", pageId)
      .eq("owner_user_id", userId)
      .select("template_config")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Página inexistente o no pertenece al usuario autenticado.");

    const persisted = readDirectPageEnvelope(data.template_config) ?? readCanonicalPageEnvelope(data.template_config);
    if (!persisted) {
      throw new Error("La persistencia de la página devolvió un envelope inválido.");
    }
    return persisted;
  },

  /**
   * Publish the current Studio snapshot atomically with optimistic concurrency
   * on `published_revision`. A stale revision cannot silently overwrite a newer
   * publish — the update matches 0 rows and raises a user-readable error.
   */
  async publish(
    supabase: SupabaseClient,
    pageId: string,
    userId: string,
    editorConfig: unknown,
    expectedRevision: number,
  ): Promise<Page> {
    const direct = isDirectDocument(editorConfig);
    const envelope = direct ? createDirectPageEnvelope(editorConfig) : acceptEngineGeneratedConfig(editorConfig);
    if (!direct) assertValidEditorConfig(envelope.editorConfig);

    const { data, error } = await supabase
      .from("pages")
      .update({
        published_template_config: envelope,
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
    if (!data) {
      throw new Error(
        "No se pudo publicar: la página fue modificada en otra sesión. Recarga la página e inténtalo de nuevo.",
      );
    }
    return data as Page;
  },

  /**
   * Take a published child page offline without deleting its canonical
   * snapshot. The next publish can reuse that snapshot and still uses the
   * same optimistic revision authority as publish.
   */
  async unpublish(
    supabase: SupabaseClient,
    pageId: string,
    userId: string,
    expectedRevision: number,
  ): Promise<Page> {
    const { data, error } = await supabase
      .from("pages")
      .update({
        published: false,
        published_at: null,
        published_revision: expectedRevision + 1,
      })
      .eq("id", pageId)
      .eq("owner_user_id", userId)
      .eq("published_revision", expectedRevision)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error(
        "No se pudo despublicar: la página fue modificada en otra sesión. Recarga la página e inténtalo de nuevo.",
      );
    }
    return data as Page;
  },
};
