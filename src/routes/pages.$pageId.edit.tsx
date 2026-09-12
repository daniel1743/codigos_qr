import { createFileRoute } from "@tanstack/react-router";
import { PowerEditorHost } from "@/components/power-editor/PowerEditorHost";

/**
 * Opens one child Page as an independent Power Editor document.
 *
 * The host performs the authenticated-session check and loads the page through
 * `pageService.getOwnPageById`, so a foreign/nonexistent page is denied safely
 * (never mounted with someone else's data).
 */
export const Route = createFileRoute("/pages/$pageId/edit")({
  component: PagePowerEditor,
});

function PagePowerEditor() {
  const { pageId } = Route.useParams();
  return <PowerEditorHost target={{ kind: "page", id: pageId }} />;
}
