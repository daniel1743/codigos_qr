import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { MagicEditorApp } from "../../isolated/magic-page-editor/MagicEditorApp";
import { setLandingBotPreviewPublicId } from "../../isolated/magic-page-editor/utils/landingBotLive";
import { setLandingBotPublishedEnabled } from "../../isolated/magic-page-editor/utils/landingBotPublishState";
import { isMagicPageDocument, serializeMagicEditorState, type MagicEditorStateV1 } from "./magic-document";
import { createPageEditorSession, type PageEditorSession } from "./document-session";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { magicPageService } from "../../services/magic-page.service";
import { convertEmbeddedCatalogToFullCatalog } from "./catalog-conversion.service";
import { extractCatalogProducts } from "./catalog-products";
import { resolveOwnedCatalogPage, type CatalogAccess, type OwnedCatalogRecord } from "./catalog-link";
import { pageService } from "../../services/page.service";
import { pageCanonicalService } from "../../services/page-canonical.service";
import type { Page } from "../../types/database";
import type { BioTemplateConfig } from "../../premium-template-studio/types";
import MobilePlatformNav from "../../components/app-shell/MobilePlatformNav";

const MEDIA_BUCKET = "avatars";

/** True only when the PUBLISHED snapshot already ships an enabled assistant. */
function isLandingBotPublished(document: unknown): boolean {
  return isMagicPageDocument(document) && document.bot?.enabled === true;
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

export function MagicProductionEditorHost({
  pageId,
  catalog = false,
  catalogBackHref,
}: {
  pageId: string;
  /** C3.3-B — open as the full-screen catalog workspace. */
  catalog?: boolean;
  /** Back target for the catalog header (`← Volver a la página`). */
  catalogBackHref?: string;
}) {
  const [supabase] = useState(() => getBrowserSupabaseClient());
  const [session, setSession] = useState<Session | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [editorSession, setEditorSession] = useState<PageEditorSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const saveTimer = useRef<number | null>(null);
  const skipFirstChange = useRef(true);
  const pendingSave = useRef<{
    state?: MagicEditorStateV1;
    config?: BioTemplateConfig;
    resolve: Array<() => void>;
    reject: Array<(reason: unknown) => void>;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSession(null);
    setPage(null);
    setEditorSession(null);
    skipFirstChange.current = true;
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
        const loaded = createPageEditorSession(
          ownedPage.template_config,
          ownedPage.title,
          ownedPage.page_type,
        );
        if (!active) return;
        setSession(data.session);
        setLandingBotPublishedEnabled(isLandingBotPublished(ownedPage.published_template_config));
        setPage(ownedPage);
        setRevision(ownedPage.published_revision);
        setEditorSession(loaded);
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
      pendingSave.current?.reject.forEach((reject) =>
        reject(new Error("El editor se cerró antes de guardar.")),
      );
      pendingSave.current = null;
    };
  }, [pageId, supabase]);

  const save = useCallback(
    async (state: MagicEditorStateV1) => {
      if (!page || !session || editorSession?.kind !== "MAGIC_V1") return;
      await magicPageService.saveDraft(
        supabase,
        page.id,
        session.user.id,
        serializeMagicEditorState(state),
      );
    },
    [editorSession?.kind, page, session, supabase],
  );

  const flushPendingSave = useCallback(
    async (stateOverride?: MagicEditorStateV1) => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }

      const pending = pendingSave.current;
      const state = stateOverride ?? pending?.state;
      if (!state) return;

      try {
        await save(state);
        pending?.resolve.forEach((resolve) => resolve());
      } catch (reason) {
        pending?.reject.forEach((reject) => reject(reason));
        throw reason;
      } finally {
        if (pendingSave.current === pending) pendingSave.current = null;
      }
    },
    [save],
  );

  const onDocumentChange = useCallback(
    (state: MagicEditorStateV1): Promise<void> => {
      if (editorSession?.kind !== "MAGIC_V1") return Promise.resolve();
      setEditorSession({ kind: "MAGIC_V1", document: state, canWrite: true });
      if (skipFirstChange.current) {
        skipFirstChange.current = false;
        return Promise.resolve();
      }

      if (pendingSave.current) {
        pendingSave.current.state = state;
      }
      const promise = new Promise<void>((resolve, reject) => {
        if (!pendingSave.current) {
          pendingSave.current = { state, resolve: [resolve], reject: [reject] };
        } else {
          pendingSave.current.resolve.push(resolve);
          pendingSave.current.reject.push(reject);
        }
      });
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null;
        void flushPendingSave().catch((reason) =>
          setError(reason instanceof Error ? reason.message : "No se pudo guardar el borrador."),
        );
      }, 650);
      return promise;
    },
    [editorSession?.kind, flushPendingSave],
  );

  const onPublish = useCallback(
    async (state: MagicEditorStateV1) => {
      if (!page || !session || editorSession?.kind !== "MAGIC_V1") return;
      if (pendingSave.current) await flushPendingSave(state);
      else await save(state);
      const published = await magicPageService.publish(
        supabase,
        page.id,
        session.user.id,
        serializeMagicEditorState(state),
        revision,
      );
      setRevision(published.published_revision);
      setPage(published);
      setLandingBotPublishedEnabled(isLandingBotPublished(published.published_template_config));
    },
    [editorSession?.kind, flushPendingSave, page, revision, save, session, supabase],
  );

  const saveCanonical = useCallback(
    async (config: BioTemplateConfig) => {
      if (
        !page ||
        !session ||
        (editorSession?.kind !== "CANONICAL_V1" && editorSession?.kind !== "NULL")
      )
        return;
      await pageCanonicalService.saveDraft(supabase, page.id, session.user.id, config);
    },
    [editorSession?.kind, page, session, supabase],
  );

  const flushPendingCanonicalSave = useCallback(
    async (configOverride?: BioTemplateConfig) => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const pending = pendingSave.current;
      const config = configOverride ?? pending?.config;
      if (!config) return;
      try {
        await saveCanonical(config);
        pending?.resolve.forEach((resolve) => resolve());
      } catch (reason) {
        pending?.reject.forEach((reject) => reject(reason));
        throw reason;
      } finally {
        if (pendingSave.current === pending) pendingSave.current = null;
      }
    },
    [saveCanonical],
  );

  const onCanonicalDocumentChange = useCallback(
    (config: BioTemplateConfig): Promise<void> => {
      if (editorSession?.kind !== "CANONICAL_V1" && editorSession?.kind !== "NULL") {
        return Promise.resolve();
      }
      setEditorSession({ kind: editorSession.kind, config, canWrite: true });
      if (skipFirstChange.current) {
        skipFirstChange.current = false;
        return Promise.resolve();
      }
      if (pendingSave.current) {
        pendingSave.current.config = config;
      }
      const promise = new Promise<void>((resolve, reject) => {
        if (!pendingSave.current) {
          pendingSave.current = { config, resolve: [resolve], reject: [reject] } as any;
        } else {
          pendingSave.current.resolve.push(resolve);
          pendingSave.current.reject.push(reject);
        }
      });
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null;
        void flushPendingCanonicalSave().catch((reason) =>
          setError(reason instanceof Error ? reason.message : "No se pudo guardar el borrador."),
        );
      }, 650);
      return promise;
    },
    [editorSession?.kind, flushPendingCanonicalSave],
  );

  const onCanonicalPublish = useCallback(
    async (config: BioTemplateConfig) => {
      if (
        !page ||
        !session ||
        (editorSession?.kind !== "CANONICAL_V1" && editorSession?.kind !== "NULL")
      )
        return;
      if (pendingSave.current) await flushPendingCanonicalSave(config);
      else await saveCanonical(config);
      const published = await pageCanonicalService.publish(
        supabase,
        page.id,
        session.user.id,
        config,
        revision,
      );
      setRevision(published.published_revision);
      setPage(published);
    },
    [
      editorSession?.kind,
      flushPendingCanonicalSave,
      page,
      revision,
      saveCanonical,
      session,
      supabase,
    ],
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

  const catalogConversion = useCallback(
    async (
      document: MagicEditorStateV1["doc"],
      templateId: MagicEditorStateV1["templateId"],
      blockKey: string,
    ) => {
      if (!page || !session)
        throw new Error("La sesión no está disponible para convertir el catálogo.");
      return convertEmbeddedCatalogToFullCatalog({
        supabase,
        userId: session.user.id,
        profileId: page.profile_id,
        landingPageTitle: page.title ?? "Mi catálogo",
        document,
        blockKey,
        saveLanding: async (nextDocument) => {
          await magicPageService.saveDraft(
            supabase,
            page.id,
            session.user.id,
            serializeMagicEditorState({ templateId, doc: nextDocument }),
          );
        },
      });
    },
    [page, session, supabase],
  );

  /**
   * Resolve a linked catalog in the PRIVATE editor context. An owned draft must
   * resolve here (publishing only controls public availability): the owned page
   * id powers "Editar catálogo" and its draft products feed the landing summary.
   */
  const catalogAccess = useMemo<CatalogAccess>(
    () => ({
      resolve: async (catalogPublicId: string) => {
        if (!session) return { pageId: null, products: null, published: false };
        const userId = session.user.id;
        const toRecord = (owned: Page | null): OwnedCatalogRecord | null =>
          owned
            ? {
                id: owned.id,
                published: owned.published === true,
                products: extractCatalogProducts(owned.template_config),
              }
            : null;
        return resolveOwnedCatalogPage(catalogPublicId, {
          byPublicId: async (publicId) =>
            toRecord(await pageService.getOwnedPageByPublicId(supabase, publicId, userId)),
          byId: async (pageId) =>
            toRecord(await pageService.getOwnPageById(supabase, pageId, userId)),
        });
      },
    }),
    [session, supabase],
  );

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        Cargando Magic Production…
      </div>
    );
  if (error || !page || !session || !editorSession) {
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

  if (editorSession.kind === "DIRECT" || editorSession.kind === "UNKNOWN") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <section className="max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Documento no compatible con este editor</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {editorSession.kind === "DIRECT"
              ? "Esta página usa el formato Direct. No se modificó el documento."
              : "El formato de esta página no se reconoce. No se modificó el documento."}
          </p>
        </section>
      </main>
    );
  }

  const canonicalSession = editorSession as Extract<
    PageEditorSession,
    { kind: "CANONICAL_V1" | "NULL" }
  >;

  // Dev-only: hand the page id to the in-canvas assistant so it can answer for
  // real while developing on localhost. No-op in production builds.
  if (editorSession.kind === "MAGIC_V1") setLandingBotPreviewPublicId(page.public_id);

  return (
    <>
      <MagicEditorApp
        catalog={catalog}
        {...(catalogBackHref ? { catalogBackHref } : {})}
        catalogAccess={catalogAccess}
        {...(editorSession.kind === "MAGIC_V1"
          ? {
              initialDocument: editorSession.document,
              onDocumentChange,
              onPublish,
              uploadAsset,
              catalogConversion,
            }
          : {
              canonicalDocument: canonicalSession.config,
              canonicalIsNew: canonicalSession.kind === "NULL",
              onCanonicalDocumentChange,
              onCanonicalPublish,
              uploadAsset,
            })}
      />
      {/* The catalog workspace is a focused full-screen editor: no global nav. */}
      {!catalog && <MobilePlatformNav editorPageId={pageId} />}
    </>
  );
}
