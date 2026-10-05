import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { PowerEditorHost } from "../components/power-editor/PowerEditorHost";
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
 * C3.2.1 — the full catalog is a CHILD/EXTENSION of the landing.
 *
 * Editing it keeps a clear "← Volver a la página" back to the landing WITHOUT
 * changing what the global "Editar página" action means. An explicit
 * `sourceMagicPageId` (a landing that already knows it owns this catalog) wins;
 * otherwise the owner's landing is resolved exactly like the dashboard resolves
 * it — never the catalog itself.
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

  return (
    <div className="relative">
      <div className="fixed left-3 top-3 z-[100]">
        <Link
          to={landingPageId ? `/pages/${landingPageId}/edit` : "/pages"}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/95 px-3 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a la página
        </Link>
      </div>
      <PowerEditorHost target={{ kind: "page", id: pageId }} />
    </div>
  );
}
