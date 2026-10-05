import React from "react";
import { ArrowRightIcon } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { useThemeTokens } from "../../hooks/useThemeTokens";
import { EditableText } from "../editor/EditableText";
import {
  catalogPublicHref,
  resolveFeaturedProducts,
  type CatalogLinkConfig,
  type CatalogProduct,
} from "../../../../features/magic-page-editor-production/catalog-link";
import { blockPrefix } from "../../utils/styles";
import { cx } from "../../utils/cx";
import { safeUrl } from "../../../../premium-template-studio/utils";
import type { BlockRef, CardFamilyDef } from "../../types/editor";

interface LinkedCatalogPreviewProps {
  block: BlockRef;
  family: CardFamilyDef;
  link: CatalogLinkConfig;
  /** Every product the linked full catalog stores. */
  products: readonly CatalogProduct[];
}

/**
 * Landing summary for a LINKED catalog. It shows at most three featured
 * products taken from the full catalog (never the landing's own copies) and a
 * "Ver catálogo completo" call to action that opens the public catalog page.
 *
 * This component is deliberately non-administrative: it never renders editor
 * controls (create/manage/feature pickers), so preview and public renders stay
 * identical to what visitors see.
 */
export function LinkedCatalogPreview({ block, family, link, products }: LinkedCatalogPreviewProps) {
  const ed = useEditor();
  const t = useThemeTokens();
  const m = ed.isMobile;
  const p = blockPrefix(block);
  const featured = resolveFeaturedProducts(link, products);
  const href = link.catalogPublicId ? catalogPublicHref(link.catalogPublicId) : null;

  return (
    <div className={cx("mx-auto w-full", m ? "px-5" : "px-10")} style={{ maxWidth: 1120 }}>
      <div className="mb-7 max-w-[620px]">
        <EditableText
          id={`${p}cards.title`}
          value={link.sectionTitle ?? family.heading}
          as="h2"
          label="Título"
          className={cx("cq-fg leading-tight", m ? "text-[28px]" : "text-[38px]")}
          style={{ fontFamily: t.displayFont }}
        />
        <EditableText
          id={`${p}cards.sub`}
          value={family.sub}
          label="Subtítulo"
          className="cq-muted mt-2 text-[15px] leading-relaxed"
        />
      </div>

      {featured.length > 0 ? (
        <div className="grid grid-cols-12" style={{ gap: m ? 12 : 20 }}>
          {featured.map((product) => {
            const productHref = safeUrl(product.ctaUrl);
            return (
              <article
                key={product.id}
                data-catalog-product={product.id}
                className="cq-surface col-span-12 flex flex-col overflow-hidden md:col-span-4"
                style={{ borderRadius: t.radius }}
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title ?? ""}
                    draggable={false}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : null}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="cq-fg text-[18px] font-semibold leading-tight">{product.title}</h3>
                    {product.price ? (
                      <span className="cq-fg shrink-0 text-[15px] font-semibold">{product.price}</span>
                    ) : null}
                  </div>
                  {product.description ? (
                    <p className="cq-muted mt-1.5 text-[14px] leading-relaxed">{product.description}</p>
                  ) : null}
                  {product.ctaLabel && productHref ? (
                    <a
                      href={productHref}
                      onClick={(event) => {
                        if (ed.mode === "edit") event.preventDefault();
                      }}
                      className="cq-fg mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold"
                    >
                      {product.ctaLabel}
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="cq-muted text-[14px]" role="status">
          Aún no hay productos destacados en tu catálogo.
        </p>
      )}

      {href ? (
        <div className="mt-6">
          <a
            href={href}
            data-catalog-cta="full"
            onClick={(event) => {
              if (ed.mode === "edit") event.preventDefault();
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold"
            style={{ background: t.accent, color: t.accentFg }}
          >
            {link.ctaLabel ?? "Ver catálogo completo"}
            <ArrowRightIcon className="h-4 w-4" />
          </a>
        </div>
      ) : null}
    </div>
  );
}
