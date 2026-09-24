import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { MagicEditorApp } from "../../isolated/magic-page-editor/MagicEditorApp";
import type { TemplateId } from "../../isolated/magic-page-editor/types/editor";
import {
  createInitialMagicEditorState,
  hydrateMagicEditorState,
  serializeMagicEditorState,
  type MagicEditorStateV1,
} from "./magic-document";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { magicPageService } from "../../services/magic-page.service";
import type { Page } from "../../types/database";

const MEDIA_BUCKET = "avatars";

function templateForPage(pageType: string): TemplateId {
  if (pageType === "portfolio") return "portfolio";
  if (pageType === "services" || pageType === "catalog") return "business";
  return "bio";
}

function extensionOf(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]{1,5}$/.test(extension) ? extension : "bin";
}

function safeName(file: File): string {
  return (file.name.split(".").slice(0, -1).join(".") || "asset")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);
}

export function MagicProductionEditorHost({ pageId }: { pageId: string }) {
  const [supabase] = useState(() => getBrowserSupabaseClient());
  const [session, setSession] = useState<Session | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [document, setDocument] = useState<MagicEditorStateV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const saveTimer = useRef<number | null>(null);
  const skipFirstChange = useRef(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("Debes iniciar sesión para abrir Magic Production.");
        const ownedPage = await magicPageService.getOwnedPage(
          supabase,
          pageId,
          data.session.user.id,
        );
        if (!ownedPage)
          throw new Error("La página no existe o no pertenece al usuario autenticado.");
        const loaded = ownedPage.template_config
          ? hydrateMagicEditorState(ownedPage.template_config)
          : createInitialMagicEditorState(templateForPage(ownedPage.page_type));
        if (!active) return;
        setSession(data.session);
        setPage(ownedPage);
        setRevision(ownedPage.published_revision);
        setDocument(loaded);
        setError(null);
      } catch (reason) {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "No se pudo cargar Magic Production.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [pageId, supabase]);

  const save = useCallback(
    async (state: MagicEditorStateV1) => {
      if (!page || !session) return;
      await magicPageService.saveDraft(
        supabase,
        page.id,
        session.user.id,
        serializeMagicEditorState(state),
      );
    },
    [page, session, supabase],
  );

  const onDocumentChange = useCallback(
    (state: MagicEditorStateV1) => {
      setDocument(state);
      if (skipFirstChange.current) {
        skipFirstChange.current = false;
        return;
      }
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        void save(state).catch((reason) =>
          setError(reason instanceof Error ? reason.message : "No se pudo guardar el borrador."),
        );
      }, 650);
    },
    [save],
  );

  const onPublish = useCallback(
    async (state: MagicEditorStateV1) => {
      if (!page || !session) return;
      await save(state);
      const published = await magicPageService.publish(
        supabase,
        page.id,
        session.user.id,
        serializeMagicEditorState(state),
        revision,
      );
      setRevision(published.published_revision);
      setPage(published);
    },
    [page, revision, save, session, supabase],
  );

  const uploadAsset = useCallback(
    async (file: File) => {
      if (!page || !session) throw new Error("La sesión no está disponible para subir la imagen.");
      const path = `${session.user.id}/magic-page-editor/${page.id}/${Date.now()}-${safeName(file)}.${extensionOf(file)}`;
      const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
    },
    [page, session, supabase],
  );

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        Cargando Magic Production…
      </div>
    );
  if (error || !page || !session || !document) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <section className="max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Magic Production
          </p>
          <h1 className="mt-2 text-xl font-semibold">Editor no disponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? "No se pudo validar la página solicitada."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <MagicEditorApp
      initialDocument={document}
      onDocumentChange={onDocumentChange}
      onPublish={onPublish}
      uploadAsset={uploadAsset}
    />
  );
}
