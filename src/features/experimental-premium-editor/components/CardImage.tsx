import React from "react";
import { AlertCircleIcon, ImagePlusIcon, RotateCcwIcon } from "lucide-react";
import { Product } from "../types/editor";
import { CROP_RATIO, FOCUS_POSITION } from "../utils/textStyle";
import { cn } from "../utils/cn";

interface CardImageProps {
  product: Product;
  selected: boolean;
  onActivate: () => void;
  onRetry: () => void;
  onPick: () => void;
}

import { useEditor } from "../contexts/EditorContext";

export function CardImage({ product, selected, onActivate, onRetry, onPick }: CardImageProps) {
  const { mode } = useEditor();
  const readonly = mode === "preview";
  const ratio = CROP_RATIO[product.imageCrop];

  return (
    <div className="relative">
      {selected && !readonly && (
        <span className="pointer-events-none absolute -top-2 left-0 z-20 -translate-y-full rounded-md bg-sel px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white">
          Imagen
        </span>
      )}
      <div
        data-editable={!readonly ? "true" : undefined}
        data-anchor={`${product.id}:image`}
        role="button"
        tabIndex={readonly ? undefined : 0}
        aria-label="Imagen del producto"
        onMouseDown={(event) => {
          if (readonly) return;
          event.stopPropagation();
          onActivate();
        }}
        onKeyDown={(event) => {
          if (readonly) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onActivate();
          }
        }}
        style={{ aspectRatio: ratio, borderRadius: Math.max(6, product.card.radius - 8) }}
        className={cn(
          "relative w-full overflow-hidden bg-[#EFEBE5] transition-[box-shadow] duration-150 ease-premium",
          readonly ? "cursor-default" : "cursor-pointer",
          !readonly && selected
            ? "shadow-[0_0_0_2px_#2F6FED]"
            : !readonly && "hover:shadow-[0_0_0_1px_rgba(47,111,237,0.35)]",
        )}
      >
        {product.image && product.imageState !== "preparing" && (
          <img
            src={product.image}
            alt={product.title}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-200 ease-premium",
              product.imageState === "error" ? "opacity-45" : "opacity-100",
            )}
            style={{ objectPosition: FOCUS_POSITION[product.imageFocus] }}
          />
        )}

        {product.imageState === "preparing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#EFEBE5]">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[#DDD7CE]">
              <div className="cq-pulse h-full w-full rounded-full bg-brand/70" />
            </div>
            <p className="text-[13px] text-body">Preparando tu foto…</p>
          </div>
        )}

        {product.imageState === "empty" && !readonly && (
          <button
            type="button"
            onMouseDown={(event) => {
              if (readonly) return;
              event.stopPropagation();
            }}
            onClick={(event) => {
              if (readonly) return;
              event.stopPropagation();
              onActivate();
              onPick();
            }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted transition-colors duration-150 ease-premium hover:bg-[#EAE5DE]"
          >
            <ImagePlusIcon className="h-6 w-6" strokeWidth={1.5} />
            <span className="text-[13px] font-medium text-body">Añadir foto</span>
          </button>
        )}

        {product.imageState === "error" && !readonly && (
          <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl border border-hairline bg-surface/95 px-3 py-2 backdrop-blur-sm">
            <AlertCircleIcon className="h-4 w-4 shrink-0 text-danger" strokeWidth={1.8} />
            <p className="min-w-0 flex-1 truncate text-[12.5px] text-body">
              No se pudo subir la foto
            </p>
            <button
              type="button"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onRetry();
              }}
              className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-medium text-brand transition-colors duration-150 ease-premium hover:bg-brandSoft"
            >
              <RotateCcwIcon className="h-3.5 w-3.5" strokeWidth={2} />
              Reintentar
            </button>
          </div>
        )}

        {product.imageOrigin === "reference" &&
          product.image &&
          product.imageState === "ready" &&
          !readonly && (
            <span className="absolute bottom-3 left-3 rounded-full bg-ink/55 px-2 py-[3px] text-[10.5px] font-medium text-white/95 backdrop-blur-[2px]">
              Imagen de referencia
            </span>
          )}
      </div>
    </div>
  );
}
