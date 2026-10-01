import { createFileRoute } from "@tanstack/react-router";
import { PowerEditorHost } from "@/components/power-editor/PowerEditorHost";
import { ProtectedRoute } from "@/components/route-guards/ProtectedRoute";

export const Route = createFileRoute("/internal/power-editor")({
  component: InternalPowerEditor,
});

function InternalPowerEditor() {
  return (
    <ProtectedRoute access="admin">
      <PowerEditorHost />
    </ProtectedRoute>
  );
}
