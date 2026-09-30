import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PowerEditorHost } from "../components/power-editor/PowerEditorHost";

export const Route = createFileRoute("/pages/$pageId/catalog")({
  validateSearch: (search: Record<string, unknown>) => ({
    sourceMagicPageId:
      typeof search.sourceMagicPageId === "string" ? search.sourceMagicPageId : undefined,
  }),
  component: CatalogPageEditor,
});

function CatalogPageEditor() {
  const { pageId } = Route.useParams();
  const { sourceMagicPageId } = Route.useSearch();

  return (
    <div className="relative">
      <div className="fixed left-3 top-3 z-[100]">
        <Link
          to={sourceMagicPageId ? `/pages/${sourceMagicPageId}/edit` : "/pages"}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/95 px-3 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a mi página
        </Link>
      </div>
      <PowerEditorHost target={{ kind: "page", id: pageId }} />
    </div>
  );
}
