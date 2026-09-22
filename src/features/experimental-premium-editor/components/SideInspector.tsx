import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { useEditor } from "../contexts/EditorContext";
import { TARGET_LABEL, FONT_OPTIONS, TextStyle, TargetKind, Badge } from "../types/editor";
import { Field } from "./toolbar/primitives";
import { cn } from "../utils/cn";
import { loadGoogleFont } from "../../../lib/fonts";

function AdvancedColorPicker({
  color,
  onChange,
  label,
}: {
  color: string;
  onChange: (c: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] font-medium text-ink">{label}</p>
      <HexColorPicker
        color={color}
        onChange={onChange}
        style={{ width: "100%", height: "160px" }}
      />
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 rounded-md border border-hairline shrink-0"
          style={{ backgroundColor: color }}
        />
        <input
          type="text"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 flex-1 rounded-md border border-hairline px-3 text-[13px] font-medium text-ink focus:outline-none focus:ring-1 focus:ring-brand uppercase"
        />
      </div>
    </div>
  );
}

function FontLibrary({ value, onChange }: { value: string; onChange: (f: string) => void }) {
  const [search, setSearch] = useState("");
  const filtered = FONT_OPTIONS.filter((f) => f.label.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-medium text-ink">Librería de fuentes</p>
      <input
        type="text"
        placeholder="Buscar tipografía…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-9 w-full rounded-md border border-hairline px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-brand"
      />
      <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1">
        {filtered.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              onChange(f.value);
              const family = f.value.split(",")[0].replace(/['"]/g, "").trim();
              loadGoogleFont(family);
            }}
            className={cn(
              "text-left px-2 py-2 text-[14px] rounded-lg transition-colors",
              f.value === value
                ? "text-brand bg-brandSoft font-medium"
                : "text-ink hover:bg-[#F5F2ED]",
            )}
            style={{ fontFamily: f.value }}
          >
            {f.label}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-[12px] text-muted px-2 py-2">No se encontraron fuentes.</p>
        )}
      </div>
    </div>
  );
}

function OverrideCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (c: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 mt-4 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-hairline text-sel focus:ring-sel"
      />
      <span className="text-[13px] text-ink">{label}</span>
    </label>
  );
}

export function SideInspector() {
  const editor = useEditor();
  const { inspectorOpen, setInspectorOpen, selection, selectedProduct } = editor;

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
          className="fixed right-0 top-16 z-30 h-[calc(100%-4rem)] w-[320px] border-l border-hairline bg-white p-5 shadow-float lg:static lg:h-auto lg:shadow-none overflow-y-auto"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-[17px] leading-tight text-ink">Ajustes avanzados</p>
              <p className="mt-1 text-[12.5px] leading-snug text-muted">
                Opcional. Configuración de precisión.
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

          <div className="mt-6 space-y-6">
            {!selection && (
              <p className="rounded-xl bg-[#FBF9F6] p-4 text-[13px] leading-relaxed text-muted">
                Selecciona un elemento para ver sus ajustes avanzados.
              </p>
            )}

            {selection && (
              <p className="text-[12px] text-muted border-b border-hairline pb-3">
                Editando:{" "}
                <span className="font-medium text-ink">{TARGET_LABEL[selection.kind]}</span>
              </p>
            )}

            {selection?.kind === "card" && selectedProduct && (
              <>
                <AdvancedColorPicker
                  label="Fondo de la tarjeta"
                  color={selectedProduct.card.background}
                  onChange={(c) =>
                    editor.patchProduct(selectedProduct.id, {
                      card: { ...selectedProduct.card, background: c },
                    })
                  }
                />
                <OverrideCheckbox
                  label="Aplicar a todas las tarjetas"
                  checked={!selectedProduct.overrides.card}
                  onChange={(checked) => editor.setOverride(selectedProduct.id, "card", !checked)}
                />
                <Field
                  label="Nota de pie (detalle)"
                  value={selectedProduct.footerNote}
                  placeholder="Plazo de entrega, garantía…"
                  onChange={(footerNote) => editor.patchProduct(selectedProduct.id, { footerNote })}
                />
                <Field
                  label="Etiquetas (separadas por coma)"
                  value={selectedProduct.tags.join(", ")}
                  placeholder="Material, medidas…"
                  onChange={(value) =>
                    editor.patchProduct(selectedProduct.id, {
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
                    editor.patchProduct(selectedProduct.id, { longDescription })
                  }
                />
              </>
            )}

            {(selection?.kind === "title" ||
              selection?.kind === "description" ||
              selection?.kind === "price") &&
              selectedProduct &&
              (() => {
                const field =
                  selection.kind === "title"
                    ? "titleStyle"
                    : selection.kind === "price"
                      ? "priceStyle"
                      : "descriptionStyle";
                const overrideKey =
                  selection.kind === "title"
                    ? "title"
                    : selection.kind === "price"
                      ? "price"
                      : "description";
                const style = selectedProduct[field] as TextStyle;
                return (
                  <>
                    <AdvancedColorPicker
                      label="Color del texto"
                      color={style.color}
                      onChange={(c) =>
                        editor.patchTextStyle(selectedProduct.id, field, { color: c })
                      }
                    />
                    <FontLibrary
                      value={style.font}
                      onChange={(f) =>
                        editor.patchTextStyle(selectedProduct.id, field, { font: f })
                      }
                    />
                    <OverrideCheckbox
                      label={`Aplicar a todos los ${selection.kind === "title" ? "títulos" : selection.kind === "price" ? "precios" : "descripciones"}`}
                      checked={!selectedProduct.overrides[overrideKey]}
                      onChange={(checked) =>
                        editor.setOverride(selectedProduct.id, overrideKey, !checked)
                      }
                    />
                  </>
                );
              })()}

            {(selection?.kind === "page-title" || selection?.kind === "page-description") &&
              (() => {
                const field = selection.kind === "page-title" ? "titleStyle" : "descriptionStyle";
                const style = editor.pageHeader[field];
                return (
                  <>
                    <AdvancedColorPicker
                      label="Color del texto"
                      color={style.color}
                      onChange={(c) => editor.patchPageHeader({ [field]: { ...style, color: c } })}
                    />
                    <FontLibrary
                      value={style.font}
                      onChange={(f) => editor.patchPageHeader({ [field]: { ...style, font: f } })}
                    />
                  </>
                );
              })()}

            {selection?.kind === "badge" &&
              selectedProduct &&
              (() => {
                const categoryId = selection.subId;
                const category = editor.categories.find((c) => c.id === categoryId);
                if (!category) return null;
                return (
                  <>
                    <AdvancedColorPicker
                      label="Color de fondo"
                      color={category.style.backgroundColor}
                      onChange={(c) =>
                        editor.patchCategory(category.id, {
                          style: { ...category.style, backgroundColor: c },
                        })
                      }
                    />
                    <AdvancedColorPicker
                      label="Color del texto"
                      color={category.style.textColor}
                      onChange={(c) =>
                        editor.patchCategory(category.id, {
                          style: { ...category.style, textColor: c },
                        })
                      }
                    />
                    <FontLibrary
                      value={category.style.font}
                      onChange={(f) =>
                        editor.patchCategory(category.id, { style: { ...category.style, font: f } })
                      }
                    />
                    <p className="mt-4 text-[12px] text-muted text-center italic">
                      Las etiquetas de categoría comparten el mismo estilo en todo el catálogo.
                    </p>
                  </>
                );
              })()}

            {selection?.kind === "cta" && selectedProduct && (
              <>
                <AdvancedColorPicker
                  label="Color del botón"
                  color={selectedProduct.cta.color}
                  onChange={(c) =>
                    editor.patchProduct(selectedProduct.id, {
                      cta: { ...selectedProduct.cta, color: c },
                    })
                  }
                />
                <OverrideCheckbox
                  label="Aplicar a todos los botones"
                  checked={!selectedProduct.overrides.cta}
                  onChange={(checked) => editor.setOverride(selectedProduct.id, "cta", !checked)}
                />
              </>
            )}

            {selection?.kind === "page" && (
              <>
                <AdvancedColorPicker
                  label="Fondo de la página"
                  color={editor.pageBackground.color}
                  onChange={(c) => editor.patchPageBackground({ color: c })}
                />
                <div className="rounded-xl border border-hairline p-4 text-center mt-6">
                  <p className="text-[13px] font-medium text-ink mb-1">Tema base (Fundación)</p>
                  <p className="text-[12px] text-muted leading-relaxed">
                    La integración de presets de Tema y Hero está reservada para fases futuras.
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
