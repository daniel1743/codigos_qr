import React from "react";
import { useEditor } from "../contexts/EditorContext";
import { Modal } from "./Modal";

export function DetailModal() {
  const { detailId, openDetail, products } = useEditor();
  const product = products.find((p) => p.id === detailId) ?? null;

  return (
    <Modal
      open={!!product}
      onClose={() => openDetail(null)}
      label="Detalle del producto"
      width="max-w-3xl"
      padded={false}
    >
      {product && (
        <div className="flex flex-col">
          <div className="relative bg-[#EFEBE5]">
            {product.image ? (
              <img
                src={product.image}
                alt={product.title}
                className="h-[280px] w-full object-cover sm:h-[360px]"
              />
            ) : (
              <div className="grid h-[240px] w-full place-items-center text-[13px] text-muted">
                Sin imagen
              </div>
            )}
            {product.imageOrigin === "reference" && product.image && (
              <span className="absolute bottom-4 left-5 rounded-full bg-ink/55 px-2.5 py-1 text-[11px] font-medium text-white/95 backdrop-blur-[2px]">
                Imagen de referencia
              </span>
            )}
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              {product.badge && (
                <span className="rounded-full bg-brandSoft px-2.5 py-1 text-[11.5px] font-medium text-brand">
                  {product.badge}
                </span>
              )}
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-hairline px-2.5 py-1 text-[11.5px] text-body"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h2
              className="mt-4 max-w-[36ch] text-[32px] leading-[1.14] text-ink sm:text-[38px]"
              style={{ fontFamily: product.titleStyle.font }}
            >
              {product.title}
            </h2>

            <p
              className="mt-3 text-[24px] font-semibold tabular-nums text-ink"
              style={{ fontFamily: product.priceStyle.font }}
            >
              {product.price}
            </p>

            <p
              className="mt-5 max-w-[62ch] text-[15px] leading-[1.65] text-body"
              style={{ fontFamily: product.descriptionStyle.font }}
            >
              {product.longDescription}
            </p>

            {product.footerNote && (
              <p className="mt-6 border-t border-hairline pt-4 text-[13px] text-muted">
                {product.footerNote}
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-[14.5px] font-medium"
                style={
                  product.cta.variant === "solid"
                    ? { background: product.cta.color, color: "#FFFFFF" }
                    : product.cta.variant === "outline"
                      ? {
                          color: product.cta.color,
                          boxShadow: `inset 0 0 0 1.5px ${product.cta.color}`,
                        }
                      : { color: product.cta.color }
                }
              >
                {product.cta.text}
              </span>
              <span className="text-[12.5px] text-muted">{product.cta.link}</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
