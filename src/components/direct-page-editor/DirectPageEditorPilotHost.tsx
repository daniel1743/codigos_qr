import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { pageService } from "../../services/page.service";
import { readDirectPageEnvelope } from "../../lib/canonical-page";
import {
  pageDocumentFromLegacy,
  type PageDocumentV1,
} from "../../lib/direct-page-editor/page-document";
import { createMagicServicesDocument } from "./magicServicesConfig";
import { DirectPageEditorShell } from "./DirectPageEditorShell";
import { createDirectPageStorageAdapter } from "./directPagePersistence";
import type { DirectAssetAdapter } from "./directPageAssets";

const MEDIA_BUCKET = "avatars";
const LOAD_TIMEOUT_MS = 20_000;

type DirectLoadStep = "session" | "page" | "document" | "ready";

async function withLoadTimeout<T>(promise: Promise<T>, step: DirectLoadStep): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Timeout cargando Direct Editor en el paso: ${step}.`)),
      LOAD_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function createAssetAdapter(
  supabase: ReturnType<typeof getBrowserSupabaseClient>,
  userId: string,
): DirectAssetAdapter {
  return {
    async upload(file) {
      const path = `${userId}/direct-page-editor/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
      const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
      return {
        id: path,
        url: data.publicUrl,
        name: file.name,
        size: file.size,
        type: file.type || "document",
      };
    },
    async remove(ref) {
      await supabase.storage.from(MEDIA_BUCKET).remove([ref]);
    },
  };
}

export function DirectPageEditorPilotHost({ pageId }: { pageId: string }) {
  const [supabase] = useState(() => getBrowserSupabaseClient());
  const [instanceId] = useState(
    () => globalThis.crypto?.randomUUID?.() ?? `direct-host-${Date.now()}`,
  );
  const [session, setSession] = useState<Session | null>(null);
  const [page, setPage] = useState<Awaited<ReturnType<typeof pageService.getOwnPageById>>>(null);
  const [document, setDocument] = useState<PageDocumentV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState<DirectLoadStep>("session");
  const [loadStatus, setLoadStatus] = useState<"pending" | "ready" | "error">("pending");
  useEffect(() => {
    let active = true;
    let currentStep: DirectLoadStep = "session";
    const startedAt = performance.now();
    const trace = (event: string, stage: DirectLoadStep = currentStep) => {
      const entry = {
        event,
        instanceId,
        pageId,
        stage,
        elapsedMs: Math.round(performance.now() - startedAt),
      };
      console.info("[DirectPageEditorLoad]", entry);
    };
    trace("HOST_MOUNT");
    trace("LOAD_EFFECT_START");
    void (async () => {
      try {
        currentStep = "session";
        setLoadStep(currentStep);
        trace("SESSION_START", "session");
        const {
          data: { session: current },
        } = await withLoadTimeout(supabase.auth.getSession(), "session");
        trace("SESSION_RESOLVE", "session");
        if (!current) throw new Error("Debes iniciar sesión para abrir el Direct Page Editor.");
        currentStep = "page";
        setLoadStep(currentStep);
        trace("PAGE_START", "page");
        const owned = await withLoadTimeout(
          pageService.getOwnPageById(supabase, pageId, current.user.id),
          "page",
        );
        trace("PAGE_RESOLVE", "page");
        if (!owned) throw new Error("Página inexistente o sin permisos para esta sesión.");
        currentStep = "document";
        setLoadStep(currentStep);
        trace("DOCUMENT_START", "document");
        const direct = readDirectPageEnvelope(owned.template_config);
        trace(direct ? "DIRECT_ENVELOPE_FOUND" : "DOCUMENT_NOT_DIRECT", "document");
        const next =
          direct?.editorConfig ??
          (owned.template_config
            ? (trace("LEGACY_FALLBACK_USED", "document"),
              pageDocumentFromLegacy(owned.template_config, owned.title))
            : (trace("STARTER_FALLBACK_USED", "document"),
              createMagicServicesDocument(owned.title)));
        trace("DOCUMENT_VALID", "document");
        if (active) {
          setSession(current);
          setPage(owned);
          setDocument(next);
          currentStep = "ready";
          setLoadStep(currentStep);
          setLoadStatus("ready");
          trace("SET_DOCUMENT", "document");
          trace("SET_READY", "ready");
        }
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "No se pudo cargar la página.";
        const timeoutStep = message.match(/paso: (session|page)/)?.[1] as
          DirectLoadStep | undefined;
        trace(
          timeoutStep
            ? `${timeoutStep.toUpperCase()}_TIMEOUT`
            : currentStep === "session"
              ? "SESSION_ERROR"
              : currentStep === "page"
                ? "PAGE_ERROR"
                : "DOCUMENT_INVALID",
          timeoutStep ?? currentStep,
        );
        if (active) setError(message);
        setLoadStatus("error");
      } finally {
        trace("LOAD_EFFECT_CLEANUP");
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      trace("HOST_UNMOUNT");
    };
  }, [instanceId, pageId, supabase]);
  const assets = useMemo(
    () => (session ? createAssetAdapter(supabase, session.user.id) : null),
    [session, supabase],
  );
  const storage = useMemo(
    () =>
      page && session
        ? createDirectPageStorageAdapter({
            supabase,
            pageId: page.id,
            userId: session.user.id,
            initialPublishedRevision: page.published_revision,
          })
        : null,
    [page, session, supabase],
  );
  if (loading)
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-white"
        data-direct-load-stage={loadStep}
        data-direct-load-status={loadStatus}
        data-direct-load-instance={instanceId}
      >
        Cargando Direct Page Editor… ({loadStep})
      </div>
    );
  if (error || !page || !session || !document || !assets || !storage)
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white"
        data-direct-load-stage={loadStep}
        data-direct-load-status="error"
        data-direct-load-instance={instanceId}
      >
        <section className="rounded-2xl border border-white/10 bg-white/10 p-6">
          <p className="text-xs uppercase tracking-[.18em]">Direct Page Editor</p>
          <h1 className="mt-2 text-xl font-semibold">Piloto no disponible</h1>
          <p className="mt-2 text-sm text-slate-300">
            {error ?? "No se pudo cargar el documento directo."}
          </p>
        </section>
      </main>
    );
  return (
    <DirectPageEditorShell
      pageId={page.id}
      pageTitle={page.title}
      initialDocument={document}
      storage={storage}
      assets={assets}
    />
  );
}
