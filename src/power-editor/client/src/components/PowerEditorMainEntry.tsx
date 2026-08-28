import { useCallback, useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { Auth } from "../../../../components/Auth";
import { getBrowserSupabaseClient } from "../../../../lib/supabase/client";
import { profileService } from "../../../../services/profile.service";
import { linkService } from "../../../../services/link.service";
import { powerEditorProjectService } from "../../../../services/power-editor-project.service";
import type { PowerEditorProject, PowerEditorRecordStatus, Profile } from "../../../../types/database";
import type { PageConfig } from "../lib/editorCandidateModel";
import { generatedRecipes } from "../lib/generatedRecipeCatalog";
import { pageConfigToPublicProfilePayload } from "../lib/publishProfileMapping";
import { PowerEditorDraftSession } from "./PowerEditorDraftSession";

type MainEntryStatus = "loading" | "ready" | "needs_project" | "missing_profile" | "error";

type ProjectCandidate = Pick<PowerEditorProject, "id" | "status">;

export function selectPrimaryPowerEditorProject<T extends ProjectCandidate>(
  projects: readonly T[],
): T | null {
  const editable = projects.find((project) => project.status === "draft");
  if (editable) return editable;
  return projects.find((project) => project.status === "published") ?? null;
}

export function createInitialMainPowerEditorConfig(): PageConfig {
  const firstRecipe = generatedRecipes[0];
  if (!firstRecipe) throw new Error("No hay recetas locales disponibles para iniciar el Power Editor.");
  return JSON.parse(JSON.stringify(firstRecipe.pageConfig)) as PageConfig;
}

export function PowerEditorMainEntry() {
  const supabase = getBrowserSupabaseClient();
  const requestedProjectId = useRouterState({
    select: (state) => {
      const value = (state.location.search as Record<string, unknown> | undefined)?.projectId;
      return typeof value === "string" && value.trim() ? value.trim() : null;
    },
  });
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [project, setProject] = useState<PowerEditorProject | null>(null);
  const [status, setStatus] = useState<MainEntryStatus>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const resolveWorkspace = useCallback(
    async (activeSession: Session) => {
      setStatus("loading");
      setMessage(null);
      try {
        const currentProfile = await profileService.getProfileByUserId(supabase, activeSession.user.id);
        if (!currentProfile) {
          setProfile(null);
          setProject(null);
          setStatus("missing_profile");
          return;
        }

        const selected = requestedProjectId
          ? await powerEditorProjectService.getOwnedEditableProject(
              supabase,
              requestedProjectId,
              activeSession.user.id,
            )
          : selectPrimaryPowerEditorProject(
              await powerEditorProjectService.listProjects(supabase, activeSession.user.id),
            );
        setProfile(currentProfile);
        setProject(selected);
        setStatus(selected ? "ready" : "needs_project");
      } catch (error) {
        setProject(null);
        setMessage(error instanceof Error ? error.message : "No se pudo abrir el Power Editor.");
        setStatus("error");
      }
    },
    [requestedProjectId, supabase],
  );

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession) void resolveWorkspace(nextSession);
      else setStatus("ready");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession) void resolveWorkspace(nextSession);
      else {
        setProject(null);
        setProfile(null);
        setStatus("ready");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [resolveWorkspace, supabase]);

  const createWorkspace = async () => {
    if (!session || !profile || creating) return;
    setCreating(true);
    setMessage(null);
    try {
      const created = await powerEditorProjectService.createProject(supabase, {
        ownerUserId: session.user.id,
        profileId: profile.id,
        name: "Mi Power Editor",
        pageConfig: createInitialMainPowerEditorConfig(),
      });
      setProject(created);
      setStatus("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el borrador del Power Editor.");
      setStatus("needs_project");
    } finally {
      setCreating(false);
    }
  };

  const publishWorkspace = async (pageConfig: PageConfig) => {
    if (!session || !profile || !project) return;
    setMessage(null);
    try {
      await powerEditorProjectService.saveDraft(supabase, project.id, session.user.id, pageConfig);
      const payload = pageConfigToPublicProfilePayload(pageConfig);
      const savedProfile = await profileService.updateProfile(supabase, profile.id, payload.profile);
      const existingLinks = await linkService.getProfileLinks(supabase, profile.id);
      await Promise.all(existingLinks.map((link) => linkService.deleteProfileLink(supabase, link.id)));
      for (const link of payload.links) {
        await linkService.createProfileLink(supabase, {
          ...link,
          profile_id: profile.id,
        });
      }
      const savedProject = await powerEditorProjectService.publishProject(
        supabase,
        project.id,
        session.user.id,
        pageConfig,
      );
      setProfile(savedProfile);
      setProject(savedProject);
      setStatus("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo publicar el Power Editor.");
      setStatus("error");
      throw error;
    }
  };

  if (!session) return <Auth />;

  if (status === "loading") {
    return <main className="grid min-h-screen place-items-center" aria-live="polite">Preparando tu Power Editor…</main>;
  }

  if (status === "missing_profile") {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-xl font-semibold">Primero crea tu perfil</h1>
          <p className="text-sm text-muted-foreground">El Power Editor necesita un perfil propio para guardar tus borradores.</p>
          <Link to="/profile" className="inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground">Ir a mi perfil</Link>
        </div>
      </main>
    );
  }

  if (status === "needs_project") {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-xl font-semibold">Tu Power Editor está listo</h1>
          <p className="text-sm text-muted-foreground">Crea un borrador privado con una receta V6 completa. No se publicará nada automáticamente.</p>
          {message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null}
          <button type="button" className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60" onClick={() => void createWorkspace()} disabled={creating}>
            {creating ? "Creando borrador…" : "Crear mi Power Editor"}
          </button>
        </div>
      </main>
    );
  }

  if (status === "error" || !project) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-xl font-semibold">No se pudo abrir el Power Editor</h1>
          <p role="alert" className="text-sm text-muted-foreground">{message ?? "Inténtalo nuevamente."}</p>
          <button type="button" className="rounded-md border px-4 py-2" onClick={() => void resolveWorkspace(session)}>Reintentar</button>
        </div>
      </main>
    );
  }

  return <PowerEditorDraftSession projectId={project.id} onPublish={publishWorkspace} />;
}
