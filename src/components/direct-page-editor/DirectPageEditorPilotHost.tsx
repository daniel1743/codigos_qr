import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AssetAdapter, UploadedAsset } from "../../premium-template-studio";
import type { BioTemplateConfig } from "../../premium-template-studio/types";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { pageService } from "../../services/page.service";
import { createPageStorageAdapter, resolvePageEditorConfig } from "../power-editor/documentTarget";
import { DirectPageEditorShell } from "./DirectPageEditorShell";
import { createMagicServicesConfig } from "./magicServicesConfig";

const MEDIA_BUCKET = "avatars";

function createPilotAssetAdapter(
  supabase: ReturnType<typeof getBrowserSupabaseClient>,
  userId: string,
): AssetAdapter {
  const extensionOf = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    return ext && /^[a-z0-9]{1,5}$/.test(ext) ? ext : "bin";
  };
  const safeBase = (file: File) =>
    (file.name.split(".").slice(0, -1).join(".") || "asset")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
  return {
    async upload(file) {
      const path = `${userId}/direct-page-editor/${Date.now()}-${safeBase(file)}.${extensionOf(file)}`;
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
      const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
      const path = ref.includes(marker) ? ref.slice(ref.indexOf(marker) + marker.length) : ref;
      if (path) await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    },
  };
}

export function DirectPageEditorPilotHost({ pageId }: { pageId: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [supabase] = useState(() => getBrowserSupabaseClient());
  const [config, setConfig] = useState<BioTemplateConfig | null>(null);
  const [page, setPage] = useState<Awaited<ReturnType<typeof pageService.getOwnPageById>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        if (!currentSession)
          throw new Error("Debes iniciar sesión para abrir el Direct Page Editor.");
        const ownedPage = await pageService.getOwnPageById(
          supabase,
          pageId,
          currentSession.user.id,
        );
        if (!ownedPage) throw new Error("Página inexistente o sin permisos para esta sesión.");
        const loaded = ownedPage.template_config
          ? resolvePageEditorConfig(ownedPage.template_config, ownedPage.title, ownedPage.page_type)
          : createMagicServicesConfig(ownedPage.title);
        if (active) {
          setSession(currentSession);
          setPage(ownedPage);
          setConfig(loaded);
          setError(null);
        }
      } catch (reason) {
        if (active)
          setError(reason instanceof Error ? reason.message : "No se pudo cargar la página.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [pageId, supabase]);

  const assets = useMemo(
    () => (session ? createPilotAssetAdapter(supabase, session.user.id) : null),
    [session, supabase],
  );
  const storage = useMemo(() => {
    if (!config || !page || !session) return null;
    return createPageStorageAdapter({
      supabase,
      pageId: page.id,
      userId: session.user.id,
      loadConfig: config,
      initialPublishedRevision: page.published_revision,
    });
  }, [config, page, session, supabase]);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-white">
        Cargando Direct Page Editor…
      </div>
    );
  if (error || !config || !page || !assets || !storage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="max-w-lg rounded-2xl border border-white/10 bg-white/10 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            Direct Page Editor
          </p>
          <h1 className="mt-2 text-xl font-semibold">Piloto no disponible</h1>
          <p className="mt-2 text-sm text-slate-300">{error ?? "No se pudo validar la página."}</p>
        </section>
      </main>
    );
  }
  return (
    <DirectPageEditorShell
      pageId={page.id}
      pageTitle={page.title}
      initialConfig={config}
      storage={storage}
      assets={assets}
    />
  );
}
