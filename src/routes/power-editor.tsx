import { createFileRoute } from "@tanstack/react-router";
import { PowerEditorHost } from "@/components/power-editor/PowerEditorHost";

export const Route = createFileRoute("/power-editor")({
  component: PowerEditorHost,
});
