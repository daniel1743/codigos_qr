import {
  CheckIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  PencilIcon,
  SparklesIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useEditor } from "../../contexts/EditorContext";
import {
  CATALOG_LINK_MAX_FEATURED_PRODUCTS,
  catalogPublicHref,
  isLinkedCatalog,
  readCatalogLink,
  toggleFeaturedProduct,
  writeCatalogLink,
} from "../../../../features/magic-page-editor-production/catalog-link";
import { useCatalogLinkResolution } from "../../hooks/useCatalogLinkResolution";
import { PanelSection } from "./controls/PanelSection";

export function CatalogConversionPanel({ blockKey }: { blockKey: string }) {
  const ed = useEditor();
  const link = readCatalogLink(ed.doc, blockKey);
  const linked = isLinkedCatalog(link);
  const catalogPublicId = link.catalogPublicId;
  const resolution = useCatalogLinkResolution(link, ed.catalogAccess);
  const [convertedCatalogPageId, setConvertedCatalogPageId] = useState<string | null>(null);
  // "Editar catálogo" must work even while the catalog is still a draft, so we
  // keep the owned page id returned by the conversion as an immediate fallback
  // for the short window before the resolver answers.
  const catalogPageId = resolution.pageId ?? convertedCatalogPageId;
  const products = resolution.status === "ready" ? resolution.products : null;
  const published = resolution.published;
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const toggleFeatured = (productId: string, selected: boolean) => {
    ed.updateDoc((doc) => {
      const current = readCatalogLink(doc, blockKey);
      return writeCatalogLink(doc, blockKey, {
        ...current,
        featuredProductIds: toggleFeaturedProduct(current.featuredProductIds, productId, selected),
      });
    });
  };

  if (linked) {
    const featured = link.featuredProductIds;
    return (
      <>
        <PanelSection
          title="Catálogo conectado"
          hint="Este bloque muestra los productos destacados del catálogo completo. Los productos se editan en el catálogo."
        >
          <div className="space-y-2.5">
            {catalogPageId ? (
              <a
                href={`/pages/${catalogPageId}/catalog`}
                data-catalog-action="edit"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-ink px-3 text-[12.5px] font-semibold text-white hover:opacity-90"
              >
                <PencilIcon className="h-4 w-4" /> Editar catálogo
              </a>
            ) : null}

            {catalogPublicId && published ? (
              <a
                href={catalogPublicHref(catalogPublicId)}
                target="_blank"
                rel="noreferrer"
                data-catalog-action="view"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line px-3 text-[12.5px] font-semibold text-ink hover:bg-black/5"
              >
                <ExternalLinkIcon className="h-4 w-4" /> Ver catálogo
              </a>
            ) : catalogPublicId ? (
              <div data-catalog-action="view-disabled" className="space-y-1.5">
                <span
                  aria-disabled="true"
                  className="inline-flex h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-line px-3 text-[12.5px] font-semibold text-mute opacity-70"
                >
                  <ExternalLinkIcon className="h-4 w-4" /> Ver catálogo
                </span>
                <p className="text-[12px] leading-snug text-mute">
                  Tu catálogo todavía es un borrador. Publícalo para habilitar el enlace público.
                </p>
              </div>
            ) : null}
          </div>
        </PanelSection>
        <PanelSection
          title="Productos destacados"
          hint={`Elige hasta ${CATALOG_LINK_MAX_FEATURED_PRODUCTS} productos para la landing.`}
        >
          {products && products.length > 0 ? (
            <ul className="space-y-1.5">
              {products.map((product) => {
                const checked = featured.includes(product.id);
                const disabled = !checked && featured.length >= CATALOG_LINK_MAX_FEATURED_PRODUCTS;
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => toggleFeatured(product.id, !checked)}
                      disabled={disabled}
                      aria-pressed={checked}
                      className="flex w-full items-center gap-2.5 rounded-xl border border-line px-3 py-2 text-left text-[12.5px] text-ink disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:border-select aria-pressed:bg-black/5"
                    >
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded border border-line">
                        {checked ? <CheckIcon className="h-3 w-3" /> : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{product.title ?? product.id}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[12.5px] text-mute" role="status">
              {resolution.status === "ready"
                ? "El catálogo todavía no tiene productos."
                : resolution.status === "unavailable"
                  ? "No se pudieron cargar los productos del catálogo."
                  : "Cargando productos del catálogo…"}
            </p>
          )}
        </PanelSection>
      </>
    );
  }

  const convert = async () => {
    if (!ed.catalogConversion || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await ed.catalogConversion(ed.doc, ed.templateId, blockKey);
      ed.replaceDocument(result.document);
      setConvertedCatalogPageId(result.catalogPage.id ?? null);
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
