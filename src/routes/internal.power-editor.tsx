import { createFileRoute, notFound } from "@tanstack/react-router";
import { PowerEditorHost } from "@/components/power-editor/PowerEditorHost";

const INTERNAL_POWER_EDITOR_ENABLED =
  (import.meta.env.DEV || import.meta.env.VITE_ENABLE_ONBOARDING_V2 === "true") &&
  import.meta.env.VITE_ENABLE_INTERNAL_POWER_EDITOR !== "false";

export const Route = createFileRoute("/internal/power-editor")({
  beforeLoad: () => {
    if (!INTERNAL_POWER_EDITOR_ENABLED) throw notFound();
  },
  component: PowerEditorHost,
});
