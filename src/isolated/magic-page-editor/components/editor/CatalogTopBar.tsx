
import React from "react";
import { ArrowLeftIcon, CheckIcon, EyeIcon, Loader2Icon, PenLineIcon } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { cx } from "../../utils/cx";

/**
 * C3.3-B — Minimal catalog workspace header.
 *
 * The full catalog is a focused, full-screen product surface: it exposes only
 * `← Volver a la página`, the workspace title, the save state, preview and
 * publish. Landing chrome (page families, add-block, settings, generic tools) is
 * intentionally absent.
 */
export function CatalogTopBar() {
  const ed = useEditor();
  const preview = ed.mode === "preview";
  const backHref = ed.catalogBackHref ?? "/pages";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-3">
      <a
        href={backHref}
        className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-2.5 text-[13px] font-medium text-ink transition-colors duration-150 hover:bg-[#F2F3F5]"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Volver a la página</span>
      </a>
      <span className="ml-1 truncate text-[14px] font-semibold text-ink">Catálogo</span>

      <span className="flex-1" />

      <span
        className="hidden items-center gap-1.5 whitespace-nowrap px-1.5 text-[12px] text-mute sm:flex"
        aria-live="polite"
      >
        {ed.saveState === "saving" ? (
          <>
            <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Guardando…
          </>
        ) : ed.saveState === "error" ? (
          <>No se pudo guardar</>
        ) : (
          <>
            <CheckIcon className="h-3.5 w-3.5 text-[#16A34A]" /> Guardado
          </>
        )}
      </span>

      <button
        type="button"
        onClick={() => ed.setMode(preview ? "edit" : "preview")}
        className={cx(
          "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 text-[13px] font-medium transition-colors duration-150",
          preview ? "bg-select-soft text-select" : "text-ink hover:bg-[#F2F3F5]",
        )}
      >
        {preview ? <PenLineIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        <span className="hidden sm:inline">{preview ? "Editar" : "Vista previa"}</span>
      </button>

      <button
        type="button"
        onClick={ed.publish}
        disabled={ed.publishing}
        className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-ink px-4 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-70"
      >
        {ed.publishing && <Loader2Icon className="h-3.5 w-3.5 animate-spin" />}
        Publicar
      </button>
    </header>
  );
}
