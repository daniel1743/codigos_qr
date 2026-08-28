import { EditorPremiumDesktop } from "../pages/EditorCandidate";
import { Auth } from "../../../../components/Auth";
import { usePowerEditorDraft } from "../hooks/usePowerEditorDraft";

export function PowerEditorDraftSession({ projectId }: { projectId: string }) {
  const draft = usePowerEditorDraft(projectId);
  if (draft.status === "loading") return <main aria-live="polite">Cargando borrador…</main>;
  if (draft.status === "unauthenticated") return <Auth />;
  if (draft.status === "missing_or_forbidden")
    return <main role="alert">No se encontró el borrador solicitado.</main>;
  if (draft.status === "archived") return <main role="alert">{draft.message}</main>;
  if (draft.status === "offline" && !draft.project)
    return (
      <main role="alert">
        {draft.message}
        <button onClick={() => void draft.reload()}>Reintentar</button>
      </main>
    );
  if (draft.status === "error" || !draft.project)
    return (
      <main role="alert">
        {draft.message ?? "No se pudo abrir el borrador."}
        <button onClick={() => void draft.reload()}>Reintentar</button>
      </main>
    );
  const statusMessage =
    draft.status === "saving"
      ? "Guardando borrador…"
      : draft.status === "saved"
        ? "Borrador guardado."
        : draft.status === "offline"
          ? draft.message
          : undefined;
  return (
    <>
      <p aria-live="polite" role={draft.status === "offline" ? "alert" : "status"}>
        {statusMessage}
      </p>
      <EditorPremiumDesktop
        draftBridge={{
          projectId: draft.project.id,
          initialPageConfig: draft.project.page_config,
          onSaveDraft: draft.save,
          saving: draft.status === "saving",
        }}
      />
    </>
  );
}
