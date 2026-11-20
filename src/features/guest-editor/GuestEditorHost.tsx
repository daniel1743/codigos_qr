import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createInitialMagicPageDocument,
  hydrateMagicEditorState,
  serializeMagicEditorState,
  type MagicEditorStateV1,
} from "../magic-page-editor-production/magic-document";
import { readGuestDraft, saveGuestDraft, type GuestDraftSaveResult } from "./guestDraft";
import { createGuestMediaStore, splitMediaProp, type GuestMediaStore } from "./guestMediaStore";
import { createLocalMediaStore } from "./localMedia";
import { GuestSignupModal, type GuestSignupModalProps } from "./GuestSignupModal";

type MagicEditorAppComponent = typeof import("../../isolated/magic-page-editor/MagicEditorApp").MagicEditorApp;

/** G4 notice: the visitor always knows where the work is and what a copy costs. */
export interface GuestDraftBannerProps {
  notice: GuestNotice | null;
  /** True when this session started from a recovered draft (independent of saving). */
  restoredFromDraft: boolean;
  pendingLocalMedia: number;
  onRequestAccount: () => void;
}

export const GUEST_DRAFT_NOTICE =
  "Este es un borrador temporal guardado en este navegador. Para conservar tu tarjeta y acceder desde otros dispositivos, crea una cuenta gratuita.";

function noticeLine(notice: GuestNotice | null): { text: string; tone: "info" | "warn" } {
  if (!notice)
    return { text: "Tus cambios se guardan localmente en este navegador.", tone: "info" };
  switch (notice.kind) {
    case "saved":
      return { text: "Borrador guardado localmente en este navegador.", tone: "info" };
    case "quota":
      return {
        text: "Sin espacio para guardar el borrador en este navegador.",
        tone: "warn",
      };
    case "too-large":
      return {
        text: "Diseño demasiado grande para guardarlo localmente.",
        tone: "warn",
      };
    default:
      return {
        text: "Almacenamiento local bloqueado en este navegador.",
        tone: "warn",
      };
  }
}

export function GuestDraftBanner({
  notice,
  restoredFromDraft,
  pendingLocalMedia,
  onRequestAccount,
}: GuestDraftBannerProps) {
  const line = noticeLine(notice);
  return (
    <div
      data-testid="guest-draft-banner"
      data-notice={notice?.kind ?? "none"}
      data-restored={restoredFromDraft ? "true" : "false"}
      className="flex min-h-9 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#e6e8ec] bg-[#fcfdfe] px-3 py-1.5 text-[12px] text-[#3a3d45]"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        {restoredFromDraft ? (
          <span data-testid="guest-draft-restored" className="font-medium text-[#15803D]">
            Borrador restaurado localmente en este navegador.
          </span>
        ) : (
          <span
            aria-live="polite"
            data-tone={line.tone}
            className={line.tone === "warn" ? "font-medium text-[#B45309]" : "text-[#3a3d45]"}
          >
            {line.text}
          </span>
        )}
        <span className="hidden text-[#6b7079] md:inline">
          {restoredFromDraft
            ? "Crea una cuenta gratuita para conservarlo y acceder desde otros dispositivos."
            : "Guarda tu tarjeta creando una cuenta gratuita para conservarla en otros dispositivos."}
        </span>
        {pendingLocalMedia > 0 && (
          <span data-testid="guest-local-media-note" className="text-[#6b7079]">
            {pendingLocalMedia === 1
              ? "· 1 foto pendiente de subir al crear cuenta."
              : `· ${pendingLocalMedia} fotos pendientes de subir al crear cuenta.`}
          </span>
        )}
      </div>
      <button
        type="button"
        data-testid="guest-banner-signup"
        onClick={onRequestAccount}
        className="ml-auto shrink-0 rounded-md bg-[#15171c] px-3 py-1 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Guardar mi tarjeta
      </button>
    </div>
  );
}

/**
 * Guest Editor V1 - the anonymous entry to the REAL Magic Editor (G1-G5).
 *
 * It is a thin shell: the editor is `MagicEditorApp`, the same component the
 * production host mounts, driven only through its public props:
 *
 *   initialDocument   -> the real Bio starter (`createInitialMagicPageDocument`),
 *                        or the visitor's own local draft when one exists (G4)
 *   onDocumentChange  -> writes the LOCAL draft (never Supabase) and feeds the
 *                        editor's own "Guardado" indicator with a truthful state
 *   uploadAsset       -> object URL for a local photo: no Storage, no remote write (G3)
 *   onPublish         -> intercepted: opens the signup gate instead of leaving the
 *                        editor to report a publish it never performed (G5)
 *
 * Nothing under `src/isolated/magic-page-editor/**` is touched, no second editor is
 * created and no Supabase client is used here.
 */
export type GuestNotice =
  | { kind: "saved"; updatedAt: number }
  | { kind: "quota" }
  | { kind: "too-large" }
  | { kind: "unavailable" };

function starterState(): MagicEditorStateV1 {
  return hydrateMagicEditorState(createInitialMagicPageDocument("bio"));
}

export function GuestEditorHost({ mediaStore }: { mediaStore?: GuestMediaStore } = {}) {
  /**
   * The draft is read in an EFFECT, never during render: `localStorage` does not
   * exist on the server, so a render-time read would make the server HTML and the
   * first client render disagree (a real hydration error, measured). Until the
   * client knows, a deterministic placeholder is rendered; afterwards the editor
   * mounts once with the RIGHT document, so it is never hydrated into a wrong state.
   */
  const [ready, setReady] = useState(false);
  const [initialDocument, setInitialDocument] = useState<MagicEditorStateV1 | null>(null);
  const [notice, setNotice] = useState<GuestNotice | null>(null);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const [pendingLocalMedia, setPendingLocalMedia] = useState(0);
  const [signup, setSignup] = useState<GuestSignupModalProps["reason"] | null>(null);
  const [Editor, setEditor] = useState<MagicEditorAppComponent | null>(null);
  const [editorLoadError, setEditorLoadError] = useState(false);
  const lastState = useRef<MagicEditorStateV1 | null>(null);

  const media = useMemo(() => createLocalMediaStore(), []);
  const photos = useMemo(() => mediaStore ?? createGuestMediaStore(), [mediaStore]);
  /** object URL -> IndexedDB id: how a stripped prop is traced back to its file. */
  const mediaIds = useRef(new Map<string, string>());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const restored = readGuestDraft();
      let state = restored?.document ? hydrateMagicEditorState(restored.document) : starterState();
      const refs = restored?.mediaRefs ?? [];
      let pendingLocalMedia = refs.length;

      // G6.2: bring back the photos the visitor picked before reloading.
      const ids = refs.flatMap((ref) => (ref.id ? [ref.id] : []));
      if (ids.length > 0) {
        const blobs = await photos.restore(ids);
        pendingLocalMedia = refs.filter((ref) => !ref.id || !blobs.has(ref.id)).length;
        for (const ref of refs) {
          const target = ref.id ? splitMediaProp(ref.prop) : null;
          const blob = ref.id ? blobs.get(ref.id) : undefined;
          if (!target || !blob) continue;
          const file = new File([blob], ref.name ?? "foto.jpg", {
            type: ref.type ?? blob.type ?? "image/jpeg",
          });
          try {
            const url = await media.createLocalSource(file);
            mediaIds.current.set(url, ref.id as string);
            state = {
              ...state,
              doc: {
                ...state.doc,
                props: {
                  ...state.doc.props,
                  [target.elementId]: {
                    ...(state.doc.props[target.elementId] ?? {}),
                    [target.propName]: url,
                  },
                },
              },
            };
          } catch {
            // The photo stays in IndexedDB: the visitor is told it must be picked again.
          }
        }
        void photos.prune();
      }

      if (cancelled) return;
      setInitialDocument(state);
      setRestoredFromDraft(Boolean(restored));
      setPendingLocalMedia(pendingLocalMedia);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [media, photos]);

  // The editor is intentionally client-loaded. Importing the full Magic Editor
  // during SSR makes this lightweight guest route wait for the entire editor
  // graph and can exceed Vite's 60s SSR transport timeout.
  useEffect(() => {
    if (!ready || !initialDocument || Editor) return;
    let cancelled = false;
    void import("../../isolated/magic-page-editor/MagicEditorApp")
      .then(({ MagicEditorApp }) => {
        if (!cancelled) setEditor(() => MagicEditorApp);
      })
      .catch(() => {
        if (!cancelled) setEditorLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [Editor, initialDocument, ready]);

  // G3 cleanup: every object URL dies with this screen.
  useEffect(() => () => media.revokeAll(), [media]);

  const persist = useCallback((state: MagicEditorStateV1): GuestDraftSaveResult => {
    const result = saveGuestDraft(serializeMagicEditorState(state), undefined, Date.now(), {
      // The draft never carries the file: only the reference to IndexedDB.
      resolveMediaId: (src) => mediaIds.current.get(src) ?? null,
    });
    setNotice(result.ok ? { kind: "saved", updatedAt: Date.now() } : { kind: result.reason });
    if (result.ok) setPendingLocalMedia(result.mediaRefs.length);
    return result;
  }, []);

  const onDocumentChange = useCallback(
    (state: MagicEditorStateV1) => {
      lastState.current = state;
      const result = persist(state);
      // Never throw towards the editor: a full storage must not break editing.
      if (!result.ok) return;
    },
    [persist],
  );

  const uploadAsset = useCallback(
    async (file: File) => {
      const url = await media.createLocalSource(file);
      // G6.2: keep the FILE (IndexedDB) so the photo survives a reload and can be
      // uploaded for real once the visitor has an account. Never throws: a browser
      // without IndexedDB simply keeps the preview for this session, and the photo is
      // honestly reported as NOT recoverable instead of promising a fake recovery.
      const id = photos.available
        ? `gm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
        : "";
      if (id) {
        mediaIds.current.set(url, id);
        await photos.putFile(file, id);
      }
      return url;
    },
    [media, photos],
  );

  const onPublish = useCallback(async (): Promise<never> => {
    setSignup("publish");
    // The editor reports whatever this throws; an honest message beats a fake success.
    throw new Error("Crea una cuenta gratis para publicar tu tarjeta.");
  }, []);

  /** Leaving for auth: the latest document is persisted and the intent recorded. */
  const handleBeforeLeave = useCallback(() => {
    if (lastState.current) persist(lastState.current);
  }, [persist]);

  // Deterministic placeholder (server and first client render agree), then the editor
  // mounts once, with the draft already resolved.
  if (!ready || !initialDocument) {
    return (
      <div
        className="flex h-screen w-full items-center justify-center bg-[#eceef1] text-[13px] text-[#6b7079]"
        data-testid="guest-editor-loading"
      >
        Preparando tu editor…
      </div>
    );
  }

  if (editorLoadError) {
    return (
      <div
        className="flex h-screen w-full items-center justify-center bg-[#eceef1] px-6 text-center text-[13px] text-[#6b7079]"
        data-testid="guest-editor-load-error"
      >
        No se pudo cargar el editor. Recarga la página para intentarlo nuevamente.
      </div>
    );
  }

  if (!Editor) {
    return (
      <div
        className="flex h-screen w-full items-center justify-center bg-[#eceef1] text-[13px] text-[#6b7079]"
        data-testid="guest-editor-loading"
      >
        Cargando tu editor…
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-[#eceef1]" data-testid="guest-editor-shell">
      <GuestDraftBanner
        notice={notice}
        restoredFromDraft={restoredFromDraft}
        pendingLocalMedia={pendingLocalMedia}
        onRequestAccount={() => setSignup("save")}
      />
      <div className="min-h-0 flex-1">
        <Editor
          fillParent
          initialDocument={initialDocument}
          onDocumentChange={onDocumentChange}
          uploadAsset={uploadAsset}
          onPublish={onPublish}
          platformHomeHref="/"
        />
      </div>
      <GuestSignupModal
        open={signup !== null}
        reason={signup ?? "save"}
        onBeforeLeave={handleBeforeLeave}
        onClose={() => setSignup(null)}
      />
    </div>
  );
}
