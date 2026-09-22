import React, { useState } from "react";
import { PlusIcon } from "lucide-react";
import { useEditor } from "../contexts/EditorContext";
import { Popover } from "./toolbar/primitives";

export function AddProductTile() {
  const { addProduct, bulkCloneProducts, products } = useEditor();
  const [open, setOpen] = useState(false);
  const [bulkCount, setBulkCount] = useState(10);
  const last = products[products.length - 1];

  return (
    <div
      data-chrome="true"
      className="group flex min-h-[320px] w-full flex-col items-center justify-center gap-4 rounded-[18px] border border-dashed border-[#D6CFC5] bg-[#FBF9F6]/60 p-6 text-center transition-[border-color,background-color] duration-200 ease-premium hover:border-brand hover:bg-brandSoft/40"
    >
      <button type="button" onClick={addProduct} className="flex flex-col items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full border border-hairline bg-surface text-brand transition-colors duration-150 ease-premium group-hover:border-brand">
          <PlusIcon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <span className="text-[14.5px] font-medium text-ink">+ Añadir producto</span>
        {last && (
          <span className="max-w-[26ch] text-[12.5px] leading-snug text-ink/60">
            Copia «{last.title}» con su formato para que solo cambies el contenido.
          </span>
        )}
      </button>

      <Popover
        open={open}
        onOpenChange={setOpen}
        width={220}
        trigger={
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
            className="text-[13px] font-medium text-brand hover:text-ink transition-colors"
          >
            Añadir varios…
          </button>
        }
      >
        {() => (
          <div className="w-full p-4 flex flex-col gap-3">
            <p className="text-[13px] font-medium text-ink">Clonación masiva</p>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] text-body">Cantidad (máx 50)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={bulkCount}
                onChange={(e) =>
                  setBulkCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))
                }
                className="w-full rounded-md border border-hairline px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[10, 20, 30, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => setBulkCount(n)}
                  className="flex-1 rounded border border-hairline bg-surface py-1 text-[11px] font-medium text-body hover:bg-brandSoft hover:text-brand transition-colors"
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-md border border-hairline bg-surface px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-brandSoft"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  bulkCloneProducts(bulkCount);
                  setOpen(false);

                  // Scroll to bottom after a brief delay to allow render
                  setTimeout(() => {
                    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                  }, 100);
                }}
                className="flex-[2] rounded-md bg-black px-3 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Agregar {bulkCount} productos
              </button>
            </div>
          </div>
        )}
      </Popover>
    </div>
  );
}
