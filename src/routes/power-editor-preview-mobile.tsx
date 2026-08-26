import { createFileRoute } from "@tanstack/react-router";
import { EditorPremiumMobile } from "../power-editor/client/src/pages/EditorCandidate";

/** Ruta temporal aislada para verificar la composición móvil del editor trasladado. */
export const Route = createFileRoute("/power-editor-preview-mobile")({
  component: PowerEditorPreviewMobileRoute,
});

function PowerEditorPreviewMobileRoute() {
  return <EditorPremiumMobile />;
}
