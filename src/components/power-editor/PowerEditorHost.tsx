import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  PremiumTemplateStudio,
  defaultAdapters,
  validateTemplate,
  type BioTemplateConfig,
} from "@/premium-template-studio";
import { readCanonicalPageEnvelope } from "@/lib/canonical-page";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { canonicalPageService } from "@/services/canonical-page.service";

interface OwnedProfile {
  id: string;
  user_id: string;
  slug: string;
  display_name: string | null;
  bio: string | null;
  template_config: unknown;
}

interface PowerEditorHostProps {
  profileId?: string | null;
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

export function PowerEditorHost({ profileId }: PowerEditorHostProps) {
  const [supabase, setSupabase] = useState<ReturnType<typeof getBrowserSupabaseClient> | null>(
    null,
  );
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<OwnedProfile | null>(null);
  const [config, setConfig] = useState<BioTemplateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const browserSupabase = getBrowserSupabaseClient();
    setSupabase(browserSupabase);

    const load = async () => {
      try {
        const requested = requestedProfile(profileId);
        if (!requested.value) throw new Error("Falta el identificador del perfil.");

        const {
          data: { session: currentSession },
        } = await browserSupabase.auth.getSession();
        if (!currentSession) throw new Error("Debes iniciar sesión para abrir el Power Editor.");

        const { data, error: profileError } = await browserSupabase
          .from("profiles")
          .select("id,user_id,slug,display_name,bio,template_config")
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
        setConfig(envelope.editorConfig);
        setError(null);
      } catch (loadError) {
        if (active)
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el perfil.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    const {
      data: { subscription },
    } = browserSupabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession && active) {
        setSession(null);
        setProfile(null);
        setConfig(null);
        setError("La sesión autenticada ya no está disponible.");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [profileId]);

  const adapters = useMemo(() => {
    if (!profile || !config || !session || !supabase) return undefined;

    return {
      ...defaultAdapters,
      storage: {
        ...defaultAdapters.storage,
        load: async () => config,
        save: async (nextConfig: BioTemplateConfig) => {
          const persisted = await canonicalPageService.save(supabase, profile.id, nextConfig);
          setConfig(persisted.editorConfig);
          setLastSavedAt(new Date().toISOString());
        },
      },
      auth: {
        getUser: () => ({
          id: session.user.id,
          email: session.user.email,
          name:
            typeof session.user.user_metadata?.full_name === "string"
              ? session.user.user_metadata.full_name
              : undefined,
        }),
      },
    };
  }, [config, profile, session, supabase]);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">Cargando Power Editor…</div>
    );

  if (error || !profile || !config || !adapters || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <section className="max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Power Editor
          </p>
          <h1 className="mt-2 text-xl font-semibold">Power Editor no disponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? "No se pudo validar el perfil solicitado."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main data-testid="power-editor" className="min-h-screen bg-background text-foreground">
      <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Power Editor V2
          </p>
          <p data-testid="power-editor-profile" className="mt-1 truncate text-sm font-medium">
            Perfil: {profile.display_name ?? profile.slug} · /{profile.slug}
          </p>
          <p data-testid="power-editor-basic-bio" className="sr-only">
            {profile.bio ?? ""}
          </p>
        </div>
        <span data-testid="power-editor-save-status" className="text-xs text-muted-foreground">
          {lastSavedAt ? "Guardado" : "Canonical cargado"}
        </span>
      </div>
      <PremiumTemplateStudio config={config} adapters={adapters} autoSave />
    </main>
  );
}
