import React, { useState } from "react";
import { CheckIcon, ImageIcon, UploadCloudIcon } from "lucide-react";
import { useEditor } from "../contexts/EditorContext";
import { IMAGE_LIBRARY } from "../data/products";
import { Modal } from "./Modal";
import { cn } from "../utils/cn";

type Tab = "library" | "upload";

export function ChangeImageModal() {
  const { changeImageId, openChangeImage, applyImage, startUpload, products } = useEditor();
  const [tab, setTab] = useState<Tab>("library");
  const product = products.find((p) => p.id === changeImageId) ?? null;

  return (
    <Modal
      open={!!product}
      onClose={() => openChangeImage(null)}
      label="Cambiar imagen"
      width="max-w-xl"
    >
      {product && (
        <div>
          <h2 className="font-display text-[24px] leading-tight text-ink">Cambiar imagen</h2>
          <p className="mt-1.5 text-[13.5px] text-muted">
            Elige una foto de tu biblioteca o sube una nueva desde este dispositivo.
          </p>

          <div className="mt-5 flex gap-1 rounded-xl bg-[#F5F2ED] p-1">
            {(
              [
                ["library", "Mis imágenes", ImageIcon],
                ["upload", "Subir foto", UploadCloudIcon],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn(
                  "flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-[13.5px] font-medium transition-colors duration-150 ease-premium",
                  tab === value ? "bg-surface text-ink shadow-card" : "text-body hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.7} />
                {label}
              </button>
            ))}
          </div>

          {tab === "library" ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {IMAGE_LIBRARY.map((image) => {
                const active = product.image === image.url;
                return (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => applyImage(product.id, image.url, image.origin)}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border text-left transition-shadow duration-150 ease-premium",
                      active
                        ? "border-sel shadow-[0_0_0_2px_rgba(47,111,237,0.35)]"
                        : "border-hairline hover:shadow-card",
                    )}
                  >
                    <img src={image.url} alt={image.name} className="h-24 w-full object-cover" />

                    <div className="flex items-center justify-between gap-1 px-2.5 py-2">
                      <span className="truncate text-[12px] text-body">{image.name}</span>
                      {active && <CheckIcon className="h-3.5 w-3.5 text-sel" strokeWidth={2.4} />}
                    </div>
                    {image.origin === "reference" && (
                      <span className="absolute left-2 top-2 rounded-full bg-ink/55 px-1.5 py-[2px] text-[9.5px] font-medium text-white/95">
                        Referencia
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => startUpload(product.id)}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#D6CFC5] bg-[#FBF9F6] px-6 py-12 transition-colors duration-150 ease-premium hover:border-brand hover:bg-brandSoft/40"
              >
                <UploadCloudIcon className="h-7 w-7 text-brand" strokeWidth={1.5} />
                <span className="text-[14px] font-medium text-ink">
                  Arrastra tu foto o toca para elegir
                </span>
                <span className="text-[12.5px] text-muted">JPG o PNG · hasta 8 MB</span>
              </button>
              <p className="mt-3 text-[12.5px] text-muted">
                La foto se prepara automáticamente para el catálogo.
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
