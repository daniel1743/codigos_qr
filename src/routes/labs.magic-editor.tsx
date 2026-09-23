import { createFileRoute } from "@tanstack/react-router";
import { MagicEditorApp } from "../isolated/magic-page-editor/MagicEditorApp";

/** Isolated, unauthenticated Magic visual editor laboratory. */
export const Route = createFileRoute("/labs/magic-editor")({
  component: MagicEditorLabPage,
});

function MagicEditorLabPage() {
  return <MagicEditorApp />;
}
