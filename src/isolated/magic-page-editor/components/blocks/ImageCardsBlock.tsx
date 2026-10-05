import React from "react";
import { PlusIcon } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { Editable } from "../editor/Editable";
import { cx } from "../../utils/cx";
import { images } from "../../data/images";
import {
  IMAGE_CARD_RADIUS,
  IMAGE_CARDS_MAX,
  addImageCard,
  imageCardId,
  imageCardsOrder,
  resolveImageCardShape,
} from "../../utils/imageCardOps";
import type { BlockRef } from "../../types/editor";

interface ImageCardsBlockProps {
  block: BlockRef;
  maxWidth?: number;
}

/** Placeholder photos used by brand-new slots until the author replaces them. */
const DEFAULT_IMAGES = [
  images.bizProducts,
  images.pfArch,
  images.bioStill,
  images.productCandle,
];

/**
 * "Tarjetas de imagen" — a general Cripqer block: a clean grid of image cards,
 * each one a simple `<a href><img/></a>` (or a plain image when it has no link).
 * Small self-contained contract: image + link + corner shape. It deliberately
 * does NOT reuse the card-family engine (`FamilyCard` / `CardBody`).
 */
export function ImageCardsBlock({ block, maxWidth = 720 }: ImageCardsBlockProps) {
  const ed = useEditor();
  const m = ed.isMobile;
  const order = imageCardsOrder(ed.doc, block.key);
  const canAdd = order.length < IMAGE_CARDS_MAX;
  const single = order.length === 1;

  return (
    <div className={cx("mx-auto w-full", m ? "px-5" : "px-10")} style={{ maxWidth: maxWidth + 80 }}>
      <div
        className={cx("grid", single ? "grid-cols-1" : "grid-cols-2", m ? "gap-3" : "gap-4")}
        style={single && !m ? { maxWidth: 360, marginInline: "auto" } : undefined}>
        {order.map((slot, index) => {
          const id = imageCardId(block.key, slot);
          const cp = ed.doc.props[id] ?? {};
          const href = (cp["href"] ?? "").trim();
          const newTab = (cp["newTab"] ?? "on") !== "off";
          const radius = IMAGE_CARD_RADIUS[resolveImageCardShape(cp["shape"])];
          const src = cp["src"] ?? DEFAULT_IMAGES[index % DEFAULT_IMAGES.length];
          const alt = cp["alt"] ?? "";
          return (
            <Editable
              key={slot}
              id={id}
              kind="imageCard"
              label={`Tarjeta ${index + 1}`}
              as={href ? "a" : "div"}
              {...(href
                ? { href, ...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {}) }
                : {})}
              {...(href ? { "aria-label": alt || `Abrir tarjeta ${index + 1}` } : {})}
              className="relative block aspect-square w-full overflow-hidden"
              style={{ borderRadius: radius }}>
              <img
                src={src}
                alt={alt}
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover" />
            </Editable>
          );
        })}
      </div>

      {ed.mode === "edit" && canAdd &&
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          ed.updateDoc((doc) => addImageCard(doc, block.key));
        }}
        className="mx-auto mt-4 flex h-11 items-center justify-center gap-2 rounded-2xl border border-dashed border-select/50 bg-white/80 px-5 text-[13px] font-medium text-select transition-colors duration-150 hover:bg-white">
        <PlusIcon className="h-4 w-4" /> Agregar tarjeta
      </button>}
    </div>
  );
}
