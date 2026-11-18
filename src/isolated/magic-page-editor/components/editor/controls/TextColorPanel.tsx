import React from "react";
import { useEditor } from "../../../contexts/EditorContext";
import { useThemeTokens } from "../../../hooks/useThemeTokens";
import { extractPageColorSwatches } from "../../../data/pageColorSwatches";
import { PanelSection } from "./PanelSection";
import { SwatchRow } from "./SwatchRow";

interface TextColorPanelProps {
  /** Text element being edited (its own colour lives in `doc.textStyles`). */
  id: string;
  swatches: string[];
}

/**
 * Colour editor for a single text element.
 *
 * For title / main texts it also exposes the EXISTING page-level text-colour
 * unification (`doc.props.page.textColor`, cascaded through `--unify-fg` /
 * `--unify-muted`), so one pick can recolour every text on the page at once.
 * It reuses the canonical mechanism — there is no second colour pipeline.
 */
export function TextColorPanel({ id, swatches }: TextColorPanelProps) {
  const ed = useEditor();
  const t = useThemeTokens();
  const current = ed.doc.textStyles[id]?.color;
  const unified = ed.doc.props["page"]?.["textColor"] ?? "";
  const applyAll = !!unified;
  const pageColors = extractPageColorSwatches(t, ed.doc.props["page"] ?? {}, swatches);

  return (
    <div className="space-y-3">
      <SwatchRow
        colors={swatches}
        pageColors={pageColors}
        value={current}
        onChange={(color) => {
          if (color === undefined) {
            ed.updateDoc((doc) => {
              const textStyles = { ...doc.textStyles };
              const next = { ...textStyles[id] };
              delete next.color;
              if (Object.keys(next).length === 0) delete textStyles[id];
              else textStyles[id] = next;
              return { ...doc, textStyles };
            });
          } else {
            ed.setTextStyle(id, { color });
          }
          // Keep the page-wide colour in sync while "aplicar a todos" is on.
          if (applyAll) ed.setProp("page", "textColor", color ?? "");
        }}
      />
      <PanelSection
        title="Aplicar a todos"
        hint="Unifica el color de todo el texto de la página, no solo el de este título."
      >
        <label className="flex items-center gap-2.5 text-[12.5px] font-medium text-ink">
          <input
            type="checkbox"
            checked={applyAll}
            onChange={(e) =>
              ed.setProp(
                "page",
                "textColor",
                e.target.checked ? (current ?? swatches[0] ?? "#111111") : "",
              )
            }
            className="h-4 w-4 rounded border-line text-select focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1"
          />
          Aplicar a todos los textos
        </label>
      </PanelSection>
    </div>
  );
}
