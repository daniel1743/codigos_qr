import { ExternalLinkIcon, LoaderCircleIcon, SparklesIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useEditor } from "../../contexts/EditorContext";
import { readCatalogLink } from "../../../../features/magic-page-editor-production/catalog-link";
import { PanelSection } from "./controls/PanelSection";

export function CatalogConversionPanel({ blockKey }: { blockKey: string }) {
  const ed = useEditor();
  const link = readCatalogLink(ed.doc, blockKey);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [catalogPageId, setCatalogPageId] = useState<string | null>(null);

  if (link.mode === "linked") {
    return (
      <PanelSection title="Catálogo conectado">
        <div className="space-y-3 text-[12.5px] text-mute">
          <p>Este bloque ya está conectado a un catálogo completo.</p>
          {catalogPageId && (
            <button
              type="button"
              onClick={() => window.location.assign(`/pages/${catalogPageId}/edit`)}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-ink px-3 font-semibold text-white hover:opacity-90"
            >
              <ExternalLinkIcon className="h-4 w-4" /> Administrar catálogo
            </button>
          )}
        </div>
      </PanelSection>
    );
  }

  const convert = async () => {
    if (!ed.catalogConversion || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await ed.catalogConversion(ed.doc, ed.templateId, blockKey);
      ed.replaceDocument(result.document);
      setCatalogPageId(result.catalogPage.id ?? null);
      toast.success("Catálogo conectado", { description: "Ya puedes administrar sus productos." });
    } catch (error) {
      toast.error("No se pudo crear el catálogo", {
        description: error instanceof Error ? error.message : "Puedes intentarlo de nuevo.",
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <PanelSection title="Amplía tu catálogo">
      <div className="space-y-3">
        <p className="text-[12.5px] leading-relaxed text-mute">
          Convierte estos productos en un catálogo completo y sigue agregando productos sin empezar
          desde cero.
        </p>
        <button
          type="button"
          onClick={() => void convert()}
          disabled={!ed.catalogConversion || busy}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-ink px-3 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <LoaderCircleIcon className="h-4 w-4 animate-spin" />
          ) : (
            <SparklesIcon className="h-4 w-4" />
          )}
          {busy ? "Creando catálogo…" : "Crear catálogo completo"}
        </button>
      </div>
    </PanelSection>
  );
}
