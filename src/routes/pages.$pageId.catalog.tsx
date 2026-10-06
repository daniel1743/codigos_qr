import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MagicProductionEditorHost } from "../features/magic-page-editor-production/MagicProductionEditorHost";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { resolveCanonicalMagicPageId } from "../lib/editor-routing/resolveCanonicalMagicPage";

export const Route = createFileRoute("/pages/$pageId/catalog")({
  validateSearch: (search: Record<string, unknown>) => ({
    sourceMagicPageId:
      typeof search.sourceMagicPageId === "string" ? search.sourceMagicPageId : undefined,
  }),
  component: CatalogPageEditor,
});

/**
 * C3.3-B — the full catalog is a CHILD/EXTENSION of the landing, but it is no
 * longer edited by the Power Editor. It opens the SAME document in the Magic
 * editor's catalog workspace: full-screen, minimal header and canonical product
 * CRUD. `page_type`, storage, `productGrid.content.products`, save/publish and
 * the landing ↔ catalog sync are untouched.
 *
 * The back target ("← Volver a la página") is the owner's landing. An explicit
 * `sourceMagicPageId` (a landing that already knows it owns this catalog) wins;
 * otherwise the owner's landing is resolved exactly like the dashboard does —
 * never the catalog itself.
 */
function CatalogPageEditor() {
  const { pageId } = Route.useParams();
  const { sourceMagicPageId } = Route.useSearch();
  const [landingPageId, setLandingPageId] = useState<string | null>(sourceMagicPageId ?? null);

  useEffect(() => {
    if (sourceMagicPageId) {
      setLandingPageId(sourceMagicPageId);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const supabase = getBrowserSupabaseClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const resolved = await resolveCanonicalMagicPageId(supabase, data.user.id);
        if (active && resolved) setLandingPageId(resolved);
      } catch {
        // The catalog editor must never be blocked by this navigation helper.
      }
    })();
    return () => {
      active = false;
    };
  }, [sourceMagicPageId]);

  const backHref = landingPageId ? `/pages/${landingPageId}/edit` : "/pages";

  return <MagicProductionEditorHost pageId={pageId} catalog catalogBackHref={backHref} />;
}
