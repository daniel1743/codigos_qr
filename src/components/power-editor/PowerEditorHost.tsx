import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  PremiumTemplateStudio,
  defaultAdapters,
  validateTemplate,
  type AssetAdapter,
  type BioTemplateConfig,
  type SaveState,
  type UploadedAsset,
} from "@/premium-template-studio";
import { readCanonicalPageEnvelope } from "@/lib/canonical-page";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { canonicalPageService } from "@/services/canonical-page.service";
import { pageService } from "@/services/page.service";
import { applyTrustedVerificationVariant } from "@/components/profile/canonicalRenderBridge";
import { AppShell } from "@/components/app-shell/AppShell";
import {
  createPageStorageAdapter,
  resolvePageEditorConfig,
  type EditorDocumentTarget,
} from "./documentTarget";
import {
  describePersistenceConfig,
  isPersistenceDebugEnabled,
  PersistenceDebugPanel,
  recordPersistenceDebugEvent,
  subscribePersistenceDebug,
  type PersistenceDebugEvent,
} from "@/premium-template-studio/diagnostics/persistenceDebug";

interface OwnedProfile {
  id: string;
  user_id: string;
  slug: string;
  public_id: string;
  display_name: string | null;
  bio: string | null;
  verification_variant: "none" | "standard" | "official-gold" | null;
  template_config: unknown;
}

interface OwnedPage {
  id: string;
  public_id: string;
  title: string;
  page_type: string;
  template_config: unknown;
  published_revision: number;
}

interface PowerEditorHostProps {
  profileId?: string | null;
  /**
   * Explicit document target. When `kind === "page"` the host opens a child
   * page from `public.pages`; otherwise it keeps the existing primary-profile
   * behavior (backward compatible).
   */
  target?: EditorDocumentTarget | null;
}

function requestedProfile(profileId?: string | null): { key: "id" | "slug"; value: string } {
  if (profileId?.trim()) return { key: "id", value: profileId.trim() };
  if (typeof window === "undefined") return { key: "id", value: "" };
  const params = new URLSearchParams(window.location.search);
  const explicitProfileId = params.get("profileId")?.trim();
  return explicitProfileId
    ? { key: "id", value: explicitProfileId }
    : { key: "slug", value: params.get("profile")?.trim() ?? "" };
}

/**
 * Durable media asset adapter for the Power Editor.
 *
 * The studio's default asset adapter (`objectUrlAssetAdapter`) returns a
 * `blob:` object URL, which is valid only for the current page session. If such
 * a URL reaches the canonical config, the avatar/banner breaks after reload
 * (`ERR_FILE_NOT_FOUND`). This adapter reuses the existing `avatars` storage
 * bucket — the same durable authority the Basic Editor uses — so uploaded media
 * resolves to a stable public URL that survives reload.
 */
const MEDIA_BUCKET = "avatars";

function createDurableAssetAdapter(
  supabase: ReturnType<typeof getBrowserSupabaseClient>,
  userId: string,
): AssetAdapter {
  const extensionOf = (file: File): string => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    return ext && /^[a-z0-9]{1,5}$/.test(ext) ? ext : "bin";
  };
  const safeBase = (file: File): string =>
    (file.name.split(".").slice(0, -1).join(".") || "asset")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);

  const storagePathFromRef = (ref: string): string => {
    const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
    const idx = ref.indexOf(marker);
    return idx >= 0 ? ref.slice(idx + marker.length) : ref;
  };

  return {
    async upload(file) {
      const path = `${userId}/power-editor/${Date.now()}-${safeBase(file)}.${extensionOf(file)}`;
      const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (error) throw error;

      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
      const type: UploadedAsset["type"] = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : "document";
      return { id: path, url: data.publicUrl, name: file.name, size: file.size, type };
    },
    async remove(ref) {
      const path = storagePathFromRef(ref);
      if (!path) return;
      await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    },
  };
}

export function PowerEditorHost({ profileId, target }: PowerEditorHostProps) {
  const targetKind = target?.kind ?? null;
  const targetPageId = target?.kind === "page" ? target.id : null;
  const isPageMode = targetKind === "page";

  const [supabase, setSupabase] = useState<ReturnType<typeof getBrowserSupabaseClient> | null>(
    null,
  );
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<OwnedProfile | null>(null);
  const [page, setPage] = useState<OwnedPage | null>(null);
  const [config, setConfig] = useState<BioTemplateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [publishState, setPublishState] = useState<"idle" | "publishing" | "published" | "error">(
    "idle",
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const currentProfileIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const browserSupabase = getBrowserSupabaseClient();
    setSupabase(browserSupabase);

    const load = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await browserSupabase.auth.getSession();
        if (!currentSession) throw new Error("Debes iniciar sesión para abrir el Power Editor.");

        if (isPageMode && targetPageId) {
          // PAGE MODE — open a child page as an independent Power document.
          const ownedPage = await pageService.getOwnPageById(
            browserSupabase,
            targetPageId,
            currentSession.user.id,
          );
          if (!ownedPage) {
            throw new Error("Página inexistente o no pertenece al usuario autenticado.");
          }

          // A freshly created page stores template_config = null; build a blank
          // canonical document in memory (seeded only with the title). The first
          // successful Save persists it into pages.template_config.
          const pageConfig = resolvePageEditorConfig(
            ownedPage.template_config,
            ownedPage.title,
            ownedPage.page_type,
          );

          if (!active) return;
          setSession(currentSession);
          setProfile(null);
          setPage({
            id: ownedPage.id,
            public_id: ownedPage.public_id,
            title: ownedPage.title,
            page_type: ownedPage.page_type,
            template_config: ownedPage.template_config,
            published_revision: ownedPage.published_revision,
          });
          setConfig(pageConfig);
          setError(null);
        } else {
          // PROFILE MODE — existing primary-profile behavior (unchanged).
          const requested = requestedProfile(profileId);
          if (!requested.value) throw new Error("Falta el identificador del perfil.");

          const { data, error: profileError } = await browserSupabase
            .from("profiles")
            .select("id,user_id,slug,public_id,display_name,bio,verification_variant,template_config")
            .eq(requested.key, requested.value)
            .eq("user_id", currentSession.user.id)
            .maybeSingle();

          if (profileError) throw profileError;
          if (!data) throw new Error("Perfil inexistente o no pertenece al usuario autenticado.");

          const ownedProfile = data as OwnedProfile;
          const envelope = readCanonicalPageEnvelope(ownedProfile.template_config);
          if (!envelope) throw new Error("El perfil no contiene un envelope canonical válido.");

          const validation = validateTemplate(envelope.editorConfig);
          if (!validation.valid) {
            const first = validation.issues.find((issue) => issue.level === "error");
            throw new Error(
              `El editorConfig no es válido: ${first?.path ?? "config"} — ${first?.message ?? "error desconocido"}.`,
            );
          }

          if (!active) return;
          setSession(currentSession);
          setProfile(ownedProfile);
          // Trusted DB verification_variant is authoritative; the canonical JSON
          // can never grant official-gold on its own.
          setConfig(
            applyTrustedVerificationVariant(envelope.editorConfig, ownedProfile.verification_variant),
          );
          setError(null);
        }
      } catch (loadError) {
        if (active)
          setError(
            loadError instanceof Error ? loadError.message : "No se pudo cargar el documento.",
          );
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    const {
      data: { subscription },
    } = browserSupabase.auth.onAuthStateChange((_event: string, nextSession: Session | null) => {
      if (!nextSession && active) {
        setSession(null);
        setProfile(null);
        setPage(null);
        setConfig(null);
        setError("La sesión autenticada ya no está disponible.");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [profileId, targetKind, targetPageId]);

  // Track the currently-active profile so a late save for a previous profile
  // can never mutate the current document's host state.
  useEffect(() => {
    currentProfileIdRef.current = profile?.id ?? null;
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    recordPersistenceDebugEvent({
      stage: "PROFILE_CONTEXT",
      profileId: profile.id,
      publicId: profile.public_id,
    });
  }, [profile]);

  useEffect(() => {
    if (!profile || !supabase || !isPersistenceDebugEnabled()) return;

    let active = true;
    const readBack = async (event: PersistenceDebugEvent, kind: "draft" | "published") => {
      try {
        const envelope =
          kind === "draft"
            ? await canonicalPageService.get(supabase, profile.id)
            : await canonicalPageService.getPublished(supabase, profile.id);
        if (!active) return;

        const persistedConfig = envelope?.editorConfig;
        const persisted = persistedConfig ? describePersistenceConfig(persistedConfig) : undefined;
        recordPersistenceDebugEvent({
          stage: kind === "draft" ? "READBACK_DRAFT" : "READBACK_PUBLISHED",
          profileId: profile.id,
          publicId: profile.public_id,
          revision: event.revision,
          config: persisted,
          expectedFingerprint: event.config?.fingerprint,
          comparison: persisted
            ? persisted.fingerprint === event.config?.fingerprint
              ? "match"
              : "mismatch"
            : "missing",
        });
      } catch {
        if (!active) return;
        recordPersistenceDebugEvent({
          stage: "READBACK_ERROR",
          profileId: profile.id,
          publicId: profile.public_id,
          revision: event.revision,
          errorCategory: "readback",
        });
      }
    };

    return subscribePersistenceDebug((event) => {
      if (event.profileId !== profile.id) return;

      if (event.stage === "SAVE_SUCCESS" || event.stage === "PRE_PUBLISH_SAVE_SUCCESS") {
        void readBack(event, "draft");
      }
      if (event.stage === "PUBLISH_SUCCESS") {
        void readBack(event, "published");
      }
    });
  }, [profile, supabase]);

  const adapters = useMemo(() => {
    if (!config || !session || !supabase) return undefined;

    const auth = {
      getUser: () => ({
        id: session.user.id,
        email: session.user.email ?? "",
        name:
          typeof session.user.user_metadata?.["full_name"] === "string"
            ? session.user.user_metadata["full_name"]
            : (session.user.email ?? ""),
      }),
    };

    if (isPageMode) {
      // PAGE MODE — writes go to `public.pages` only via the page canonical
      // service. No profile RPC is ever invoked from this branch.
      if (!page) return undefined;
      return {
        ...defaultAdapters,
        assets: createDurableAssetAdapter(supabase, session.user.id),
        storage: createPageStorageAdapter({
          supabase,
          pageId: page.id,
          userId: session.user.id,
          loadConfig: config,
          initialPublishedRevision: page.published_revision,
          onPublished: () => {
            setPublishState("published");
          },
        }),
        auth,
      };
    }

    if (!profile) return undefined;

    return {
      ...defaultAdapters,
      assets: createDurableAssetAdapter(supabase, session.user.id),
      storage: {
        ...defaultAdapters.storage,
        load: async () => config,
        save: async (nextConfig: BioTemplateConfig) => {
          const profileIdAtSave = profile.id;
          await canonicalPageService.save(supabase, profileIdAtSave, nextConfig);
          // Stale-response protection: a late save for a previous profile must
          // never mutate the current document's host state.
          if (currentProfileIdRef.current === profileIdAtSave) {
            setLastSavedAt(new Date().toISOString());
          }
        },
        publish: async (nextConfig: BioTemplateConfig) => {
          setPublishState("publishing");
          try {
            const publication = await canonicalPageService.publish(
              supabase,
              profile.id,
              nextConfig,
            );
            if (currentProfileIdRef.current === profile.id) {
              setPublishState("published");
            }
            return { url: `/p/${publication.public_id}` };
          } catch (publishError) {
            if (currentProfileIdRef.current === profile.id) {
              setPublishState("error");
            }
            throw publishError;
          }
        },
      },
      auth,
    };
  }, [config, profile, page, session, supabase, isPageMode]);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">Cargando Power Editor…</div>
    );

  const documentReady = isPageMode
    ? Boolean(page && config && adapters && session)
    : Boolean(profile && config && adapters && session);

  if (error || !documentReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <section className="max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Power Editor
          </p>
          <h1 className="mt-2 text-xl font-semibold">Power Editor no disponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? "No se pudo validar el documento solicitado."}
          </p>
        </section>
      </main>
    );
  }

  const documentId = isPageMode ? page!.id : profile!.id;

  return (
    <AppShell>
      <main
        data-testid="power-editor"
        className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden bg-background text-foreground [&>.pts-scope]:!h-full [&>.pts-scope]:!max-h-full"
      >
        <div className="sr-only">
          <p data-testid="power-editor-profile" className="sr-only">
            {isPageMode
              ? `Página: ${page!.title} · ${page!.public_id}`
              : `Perfil: ${profile!.display_name ?? profile!.slug} · /${profile!.slug}`}
          </p>
          {!isPageMode && (
            <p data-testid="power-editor-basic-bio" className="sr-only">
              {profile!.bio ?? ""}
            </p>
          )}
          <span data-testid="power-editor-save-status">
            {publishState === "publishing"
              ? "Publicando…"
              : publishState === "error"
                ? "Error al publicar"
                : saveState === "saving"
                  ? "Guardando…"
                  : saveState === "error"
                    ? "Error al guardar"
                    : saveState === "dirty"
                      ? "Cambios sin guardar"
                      : publishState === "published"
                        ? "Publicado"
                        : lastSavedAt
                          ? "Guardado"
                          : "Canonical cargado"}
          </span>
        </div>
        <PremiumTemplateStudio
          config={config ?? undefined}
          adapters={adapters}
          autoSave
          documentId={documentId}
          onSaveStateChange={(s) => {
            setSaveState(s);
            if (s === "dirty") setPublishState("idle");
          }}
        />
      </main>
    </AppShell>
  );
}
