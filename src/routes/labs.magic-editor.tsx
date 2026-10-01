import { createFileRoute, notFound } from "@tanstack/react-router";
import { MagicEditorApp } from "../isolated/magic-page-editor/MagicEditorApp";

/** Isolated, unauthenticated Magic visual editor laboratory. */
export const Route = createFileRoute("/labs/magic-editor")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: MagicEditorLabPage,
});

function MagicEditorLabPage() {
  return <MagicEditorApp />;
}
