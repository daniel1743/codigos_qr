import { createFileRoute } from "@tanstack/react-router";
import { PowerEditorHost } from "@/components/power-editor/PowerEditorHost";
import { ProtectedRoute } from "@/components/route-guards/ProtectedRoute";

export const Route = createFileRoute("/power-editor")({
  component: ProtectedPowerEditor,
});

function ProtectedPowerEditor() {
  return (
    <ProtectedRoute access="authenticated">
      <PowerEditorHost />
    </ProtectedRoute>
  );
}
