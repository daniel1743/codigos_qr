import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";
import { useEditor } from "../contexts/EditorContext";
import { TARGET_LABEL } from "../types/editor";
import { Field } from "./toolbar/primitives";

export function SideInspector() {
  const { inspectorOpen, setInspectorOpen, selection, selectedProduct, patchProduct } = useEditor();

  return (
    <AnimatePresence>
      {inspectorOpen && (
        <motion.aside
          data-chrome="true"
          aria-label="Ajustes avanzados"
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 32, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
          className="fixed right-0 top-16 z-30 h-[calc(100%-4rem)] w-[320px] border-l border-hairline bg-surface p-5 shadow-float lg:static lg:h-auto lg:shadow-none"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-[17px] leading-tight text-ink">Ajustes avanzados</p>
              <p className="mt-1 text-[12.5px] leading-snug text-muted">
                Opcional. Todo lo frecuente se edita directamente sobre la tarjeta.
              </p>
            </div>
            <button
              type="button"
              aria-label="Cerrar ajustes avanzados"
              onClick={() => setInspectorOpen(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-body transition-colors duration-150 ease-premium hover:bg-[#F5F2ED]"
            >
              <XIcon className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>

          <div className="mt-6 space-y-5">
            {selectedProduct && selection ? (
              <>
                <p className="text-[12px] text-muted">
                  Selección actual:{" "}
                  <span className="font-medium text-ink">{TARGET_LABEL[selection.kind]}</span> ·{" "}
                  {selectedProduct.title}
                </p>
                <Field
                  label="Etiqueta destacada"
                  value={selectedProduct.badge ?? ""}
                  placeholder="Sin etiqueta"
                  onChange={(badge) =>
                    patchProduct(selectedProduct.id, { badge: badge.trim() ? badge : null })
                  }
                />

                <Field
                  label="Nota de pie (detalle)"
                  value={selectedProduct.footerNote}
                  placeholder="Plazo de entrega, garantía…"
                  onChange={(footerNote) => patchProduct(selectedProduct.id, { footerNote })}
                />

                <Field
                  label="Etiquetas (separadas por coma)"
                  value={selectedProduct.tags.join(", ")}
                  placeholder="Material, medidas…"
                  onChange={(value) =>
                    patchProduct(selectedProduct.id, {
                      tags: value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    })
                  }
                />

                <Field
                  label="Descripción larga (detalle)"
                  value={selectedProduct.longDescription}
                  onChange={(longDescription) =>
                    patchProduct(selectedProduct.id, { longDescription })
                  }
                />
              </>
            ) : (
              <p className="rounded-xl bg-[#FBF9F6] p-4 text-[13px] leading-relaxed text-muted">
                Selecciona una tarjeta para ver sus ajustes opcionales.
              </p>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
