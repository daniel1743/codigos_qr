import { createFileRoute } from "@tanstack/react-router";
import { EditorPremiumDesktop } from "../power-editor/client/src/pages/EditorCandidate";

/** Ruta temporal aislada: no integra datos, QR, publicación ni editor existente. */
export const Route = createFileRoute("/power-editor-preview")({
  component: PowerEditorPreviewRoute,
});

function PowerEditorPreviewRoute() {
  return <EditorPremiumDesktop />;
}
