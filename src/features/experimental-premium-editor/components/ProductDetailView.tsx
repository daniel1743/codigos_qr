import React from "react";
import { ArrowLeftIcon } from "lucide-react";
import { useEditor } from "../contexts/EditorContext";
import { cn } from "../utils/cn";

export function ProductDetailView() {
  const { products, viewingProductId, setViewingProductId } = useEditor();

  if (!viewingProductId) return null;
  const product = products.find((p) => p.id === viewingProductId);
  if (!product) return null;

  let src = product.image;
  let srcSet = undefined;
  let sizes = undefined;
  
  if (src && src.includes("/productos-fuxion/productos/")) {
    const parts = src.split("/");
    const filename = parts.pop() || "";
    const name = filename.substring(0, filename.lastIndexOf('.'));
    const w960 = `/productos-fuxion/optimized/${name}-960.webp`;
    const w1440 = `/productos-fuxion/optimized/${name}-1440.webp`;
    srcSet = `${w960} 960w, ${w1440} 1440w`;
    sizes = "(max-width: 1024px) 100vw, 800px";
    src = w960;
  }

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col bg-canvas overflow-y-auto"
      id="workspace-scroll-container"
    >
      <div className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
        <button
          type="button"
          onClick={() => setViewingProductId(null)}
          className="mb-8 flex items-center gap-2 text-[14px] font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeftIcon className="h-4 w-4" strokeWidth={2} />
          Volver al catálogo
        </button>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_400px]">
          {/* Left Column: Image */}
          <div>
            <div className="overflow-hidden rounded-3xl border border-hairline bg-surface shadow-sm">
              {product.image ? (
                <img
                  src={src!}
                  srcSet={srcSet}
                  sizes={sizes}
                  alt={product.title}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center bg-[#EAE5DE]">
                  <div className="text-[13px] font-medium text-muted">Sin imagen</div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="flex flex-col py-2">
            <h1
              style={product.titleStyle}
              className="mb-4 whitespace-pre-wrap text-[32px] leading-[1.15]"
            >
              {product.title}
            </h1>

            <div className="mb-8 font-medium">
              <span
                style={product.priceStyle}
                className="rounded-full bg-brand/5 px-3 py-1 text-[18px]"
              >
                {product.price}
              </span>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-muted">
                  Descripción
                </h3>
                <p
                  style={product.descriptionStyle}
                  className="whitespace-pre-wrap leading-relaxed text-body opacity-90"
                >
                  {product.description}
                </p>
              </div>

              {product.longDescription && (
                <div className="pt-2">
                  <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-muted">
                    Detalles
                  </h3>
                  <p
                    style={product.descriptionStyle}
                    className="whitespace-pre-wrap leading-relaxed text-body opacity-90"
                  >
                    {product.longDescription}
                  </p>
                </div>
              )}

              {product.footerNote && (
                <div className="pt-2">
                  <p
                    style={{ ...product.descriptionStyle, size: 13 }}
                    className="whitespace-pre-wrap leading-relaxed text-muted"
                  >
                    {product.footerNote}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
