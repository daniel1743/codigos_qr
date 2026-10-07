import React from "react";
import { PlusIcon } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { useThemeTokens } from "../../hooks/useThemeTokens";
import { Editable } from "../editor/Editable";
import { EditableText } from "../editor/EditableText";
import { cx } from "../../utils/cx";
import { blockPrefix } from "../../utils/styles";
import { resolveRowTreatment } from "../../utils/rowTreatment";
import {
  SERVICES_MAX,
  addService,
  readService,
  serviceFieldId,
  servicesOrder,
} from "../../utils/servicesOps";
import type { BlockRef } from "../../types/editor";

interface ServicesBlockProps {
  block: BlockRef;
  maxWidth?: number;
}

/**
 * "Servicios" — a price list: title, detail and price per row, with no image.
 *
 * Its own family, not an alias of `collection`. The card family requires an
 * image per item and draws a media slot in every layout; a service entry has
 * none, and forcing one in would invent content rather than present it.
 *
 * Two row treatments, from the shared `rowTreatment` vocabulary:
 *  · `surface` (default) — each row is a raised surface, as `collection` rows are;
 *  · `rule` — a plain list separated by hairlines, with no per-item surface.
 *
 * Colours come from the page tokens (`--surface`, `--line`, `--accent`), so the
 * block inherits whatever palette the page uses instead of carrying its own.
 */
export function ServicesBlock({ block, maxWidth = 720 }: ServicesBlockProps) {
  const ed = useEditor();
  const m = ed.isMobile;
  const t = useThemeTokens();
  const order = servicesOrder(ed.doc, block.key);
  const canAdd = order.length < SERVICES_MAX;
  const blockProps = ed.doc.props[`block:${block.key}`] ?? {};
  const treatment = resolveRowTreatment(blockProps["rowTreatment"]);

  /** Opt-in, exactly like the reviews heading: nothing appears until it is written. */
  const titleId = `${blockPrefix(block)}services.title`;
  const title = ed.doc.texts[titleId] ?? "";

  const rowClass =
    treatment === "surface"
      ? "cq-surface cq-line flex items-baseline justify-between gap-4 border p-4"
      : "cq-line flex items-baseline justify-between gap-4 border-b py-4";

  return (
    <div
      className={cx("mx-auto w-full", m ? "px-5" : "px-10")}
      style={{ maxWidth: maxWidth + 80 }}
      data-row-treatment={treatment}
    >
      {title.trim() !== "" && (
        <EditableText
          id={titleId}
          value={title}
          as="h2"
          label="Título del bloque"
          className="cq-fg mb-5 text-[22px] leading-tight"
          style={{ fontFamily: t.displayFont }}
        />
      )}

      <ul className={cx(treatment === "rule" && "cq-line border-t")}>
        {order.map((slot, index) => {
          const row = readService(ed.doc, block.key, slot, index);
          return (
            <Editable
              key={slot}
              id={row.id}
              kind="service"
              blockKey={block.key}
              label={`Servicio ${index + 1}`}
              as="li"
              className={rowClass}
              style={treatment === "surface" ? { borderRadius: t.radius, marginBottom: 12 } : undefined}
            >
              <div className="min-w-0">
                <EditableText
                  id={serviceFieldId(block.key, slot, "title")}
                  value={row.title}
                  as="p"
                  label="Título"
                  className="cq-fg text-[15px] font-semibold"
                />
                <EditableText
                  id={serviceFieldId(block.key, slot, "detail")}
                  value={row.detail}
                  as="p"
                  label="Detalle"
                  className="cq-muted mt-0.5 text-[13px]"
                />
              </div>
              <EditableText
                id={serviceFieldId(block.key, slot, "price")}
                value={row.price}
                as="span"
                label="Precio"
                className="shrink-0 text-[14px] font-semibold"
                style={{ color: 'var(--accent)' }}
              />
            </Editable>
          );
        })}
      </ul>

      {ed.mode === "edit" && canAdd && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            ed.updateDoc((doc) => addService(doc, block.key));
          }}
          className="mx-auto mt-4 flex h-11 items-center justify-center gap-2 rounded-2xl border border-dashed border-select/50 bg-white/80 px-5 text-[13px] font-medium text-select transition-colors duration-150 hover:bg-white"
        >
          <PlusIcon className="h-4 w-4" /> Agregar servicio
        </button>
      )}
    </div>
  );
}
