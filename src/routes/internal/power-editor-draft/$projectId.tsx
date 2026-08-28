import { createFileRoute } from "@tanstack/react-router";
import { PowerEditorDraftSession } from "../../../power-editor/client/src/components/PowerEditorDraftSession";

/** Ruta temporal, no enlazada: carga exclusivamente un borrador propio por UUID. */
export const Route = createFileRoute("/internal/power-editor-draft/$projectId")({
  component: PowerEditorDraftRoute,
});

function PowerEditorDraftRoute() {
  const { projectId } = Route.useParams();
  return <PowerEditorDraftSession projectId={projectId} />;
}
