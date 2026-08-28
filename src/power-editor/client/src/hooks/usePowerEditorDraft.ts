import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "../../../../lib/supabase/client";
import { powerEditorProjectService } from "../../../../services/power-editor-project.service";
import type { PowerEditorProject } from "../../../../types/database";
import type { PageConfig } from "../lib/editorCandidateModel";

export type PowerEditorDraftStatus =
  | "loading"
  | "ready"
  | "saving"
  | "saved"
  | "offline"
  | "missing_or_forbidden"
  | "unauthenticated"
  | "archived"
  | "error";
type DraftState = {
  status: PowerEditorDraftStatus;
  project?: PowerEditorProject | undefined;
  message?: string | undefined;
};

function isOffline(error?: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  return (
    error instanceof TypeError ||
    /network|fetch|offline/i.test(error instanceof Error ? error.message : "")
  );
}

function messageFor(error: unknown) {
  if (isOffline(error))
    return "No hay conexión. Tus cambios siguen en el editor; vuelve a intentar Guardar.";
  return "No se pudo abrir o guardar este borrador.";
}

export function usePowerEditorDraft(projectId: string) {
  const [state, setState] = useState<DraftState>({ status: "loading" });
  const requestRef = useRef<Promise<void> | null>(null);
  const activeUserIdRef = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    const supabase = getBrowserSupabaseClient();
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setState({ status: "offline", message: "Sin conexión. No es posible cargar el borrador." });
      return;
    }
    setState({ status: "loading" });
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      activeUserIdRef.current = undefined;
      setState({ status: "unauthenticated", message: "Inicia sesión para abrir este borrador." });
      return;
    }
    activeUserIdRef.current = auth.user.id;
    try {
      const project = await powerEditorProjectService.getOwnedEditableProject(
        supabase,
        projectId,
        auth.user.id,
      );
      setState({ status: "ready", project });
    } catch (error) {
      if (isOffline(error)) setState({ status: "offline", message: messageFor(error) });
      else if (error instanceof Error && /archivado/i.test(error.message))
        setState({ status: "archived", message: error.message });
      else
        setState({
          status: "missing_or_forbidden",
          message: "No se encontró el borrador solicitado.",
        });
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === "SIGNED_OUT" || !session?.user) {
          activeUserIdRef.current = undefined;
          setState({
            status: "unauthenticated",
            message: "Tu sesión terminó. Inicia sesión para guardar.",
          });
          return;
        }
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")
          void load();
      },
    );
    const offline = () =>
      setState((current) => ({
        ...current,
        status: "offline",
        message: "No hay conexión. Tus cambios siguen en el editor; vuelve a intentar Guardar.",
      }));
    const online = () =>
      setState((current) => {
        if (current.status !== "offline") return current;
        return current.project
          ? { status: "ready", project: current.project }
          : { status: "loading" };
      });
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, [load]);

  const save = useCallback(
    async (pageConfig: PageConfig) => {
      if (requestRef.current) return requestRef.current;
      const currentProject = state.project;
      const userId = activeUserIdRef.current;
      if (!currentProject || !userId) {
        setState({
          status: "unauthenticated",
          message: "Tu sesión terminó. Inicia sesión para guardar.",
        });
        return;
      }
      if (currentProject.status === "archived") {
        setState({
          status: "archived",
          project: currentProject,
          message: "Este borrador está archivado y no puede editarse.",
        });
        return;
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setState({
          status: "offline",
          project: currentProject,
          message: "No hay conexión. Tus cambios siguen en el editor; vuelve a intentar Guardar.",
        });
        return;
      }
      const operation = (async () => {
        setState({ status: "saving", project: currentProject });
        try {
          const supabase = getBrowserSupabaseClient();
          const { data: auth, error: authError } = await supabase.auth.getUser();
          if (authError || auth.user?.id !== userId) {
            activeUserIdRef.current = undefined;
            setState({
              status: "unauthenticated",
              message: "Tu sesión terminó. Inicia sesión para guardar.",
            });
            return;
          }
          const saved = await powerEditorProjectService.saveDraft(
            supabase,
            currentProject.id,
            userId,
            pageConfig,
          );
          setState({ status: "saved", project: saved });
          window.setTimeout(
            () =>
              setState((current) =>
                current.status === "saved" ? { status: "ready", project: saved } : current,
              ),
            1400,
          );
        } catch (error) {
          if (isOffline(error))
            setState({ status: "offline", project: currentProject, message: messageFor(error) });
          else
            setState({
              status: "missing_or_forbidden",
              message: "No se pudo guardar el borrador solicitado.",
            });
        } finally {
          requestRef.current = null;
        }
      })();
      requestRef.current = operation;
      return operation;
    },
    [state.project],
  );

  return { ...state, reload: load, save };
}
