import { createFileRoute } from "@tanstack/react-router";
import { PowerEditorHost } from "./internal.power-editor";

export const Route = createFileRoute("/power-editor")({
  component: PowerEditorHost,
});
