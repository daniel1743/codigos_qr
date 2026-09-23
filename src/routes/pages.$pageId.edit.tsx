import { createFileRoute } from "@tanstack/react-router";
import { PowerEditorHost } from "@/components/power-editor/PowerEditorHost";
import { DirectPageEditorPilotHost } from "@/components/direct-page-editor/DirectPageEditorPilotHost";
import { MagicProductionEditorHost } from "@/features/magic-page-editor-production/MagicProductionEditorHost";

/**
 * Opens one child Page as the canonical Magic Production Editor document.
 *
 * The host performs the authenticated-session check and loads the page through
 * `pageService.getOwnPageById`, so a foreign/nonexistent page is denied safely
 * (never mounted with someone else's data).
 */
export const Route = createFileRoute("/pages/$pageId/edit")({
  validateSearch: (search: Record<string, unknown>) => ({
    directEditor: typeof search["directEditor"] === "string" ? search["directEditor"] : undefined,
    magicProduction: typeof search["magicProduction"] === "string" ? search["magicProduction"] : undefined,
    legacyEditor: typeof search["legacyEditor"] === "string" ? search["legacyEditor"] : undefined,
  }),
  component: PagePowerEditor,
});

function PagePowerEditor() {
  const { pageId } = Route.useParams();
  const { directEditor, legacyEditor } = Route.useSearch();
  // Emergency-only rollback for the pre-cutover editor. This is intentionally
  // undocumented in the product UI and keeps the old host reachable without
  // making it the normal route fallback.
  if (legacyEditor === "1") return <PowerEditorHost target={{ kind: "page", id: pageId }} />;
  const magicPilot = directEditor === "magic";
  if (magicPilot) return <DirectPageEditorPilotHost pageId={pageId} />;
  return <MagicProductionEditorHost pageId={pageId} />;
}
