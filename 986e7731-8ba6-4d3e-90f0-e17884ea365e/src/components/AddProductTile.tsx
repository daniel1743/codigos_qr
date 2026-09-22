import React from "react";
import { PlusIcon } from "lucide-react";
import { useEditor } from "../contexts/EditorContext";

export function AddProductTile() {
  const { addProduct, products } = useEditor();
  const last = products[products.length - 1];

  return (
    <button
      type="button"
      data-chrome="true"
      onClick={addProduct}
      className="group flex min-h-[320px] w-full flex-col items-center justify-center gap-3 rounded-[18px] border border-dashed border-[#D6CFC5] bg-[#FBF9F6]/60 p-6 text-center transition-[border-color,background-color] duration-200 ease-premium hover:border-brand hover:bg-brandSoft/40"
    >
      <span className="grid h-11 w-11 place-items-center rounded-full border border-hairline bg-surface text-brand transition-colors duration-150 ease-premium group-hover:border-brand">
        <PlusIcon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span className="text-[14.5px] font-medium text-ink">+ Añadir producto</span>
      {last && (
        <span className="max-w-[26ch] text-[12.5px] leading-snug text-muted">
          Copia «{last.title}» con su formato para que solo cambies el contenido.
        </span>
      )}
    </button>
  );
}
