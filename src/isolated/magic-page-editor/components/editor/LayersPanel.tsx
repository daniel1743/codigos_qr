import React, { useMemo, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  EyeOffIcon,
  LayersIcon,
  LockIcon,
  Trash2Icon,
  UnlockIcon,
  XIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { blockKit, blockLabels, preparedBlockKit } from "../../data/blockKit";
import { blockPropsKey, isBlockLocked } from "../../utils/blockLock";
import { cx } from "../../utils/cx";
import type { BlockType, PageDoc } from "../../types/editor";

/** One real block of the active document, as the Layers list sees it. */
export interface LayerRow {
  key: string;
  type: BlockType;
  /** Human-readable native name ("Portada", "Galeria", "Llamado a la accion"). */
  name: string;
  /** 1-based position among the blocks sharing this type. */
  ordinal: number;
  /** How many blocks of this type the document has; 1 means no disambiguation. */
  duplicateCount: number;
  locked: boolean;
  hidden: boolean;
}

const blockIcons = new Map<BlockType, LucideIcon>();
for (const item of [...blockKit, ...preparedBlockKit]) blockIcons.set(item.type, item.icon);

/**
 * Layers is derived from the live document on every render. There is no second
 * list to keep in sync: moving, hiding or deleting a block is visible here on
 * the same commit the canvas renders.
 *
 * Duplicated blocks of one type are told apart by their order in the document
 * ("Texto 1", "Texto 2"). Their internal keys are never rewritten.
 */
export function layerRows(doc: PageDoc): LayerRow[] {
  const totals = new Map<BlockType, number>();
  for (const block of doc.blocks) totals.set(block.type, (totals.get(block.type) ?? 0) + 1);
  const seen = new Map<BlockType, number>();
  return doc.blocks.map((block) => {
    const ordinal = (seen.get(block.type) ?? 0) + 1;
    seen.set(block.type, ordinal);
    return {
      key: block.key,
      type: block.type,
      name: blockLabels[block.type] ?? block.type,
      ordinal,
      duplicateCount: totals.get(block.type) ?? 1,
      locked: isBlockLocked(doc, block.key),
      hidden: !!block.hidden,
    };
  });
}

/** Readable name of a row: the native label, numbered only when it repeats. */
export function layerRowName(row: LayerRow): string {
  return row.duplicateCount > 1 ? `${row.name} ${row.ordinal}` : row.name;
}

function RowButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  active,
  danger,
  touch,
  testId,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
  touch: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      data-layer-action={testId}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "grid shrink-0 place-items-center rounded-lg transition-colors duration-150 disabled:pointer-events-none disabled:opacity-30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1",
        touch ? "h-10 w-10" : "h-8 w-8",
        danger
          ? "text-[#C2410C] hover:bg-[#FFF1EA]"
          : active
            ? "bg-select-soft text-select"
            : "text-ink hover:bg-[#F2F3F5]",
      )}
    >
      <Icon className={touch ? "h-4 w-4" : "h-3.5 w-3.5"} />
    </button>
  );
}

export interface LayersPanelProps {
  /** Desktop renders an anchored popover; mobile renders the same panel as a sheet. */
  variant?: "popover" | "sheet";
  onClose?: () => void;
}

/**
 * Capas: the real blocks of the document, in document order.
 *
 * Select, reorder, lock and delete reuse the native editor actions
 * (`select`, `moveBlock`, `setProp(...,"locked",...)`, `deleteBlock`), so undo,
 * history, serialization and hydration keep working exactly as they do from the
 * canvas. Nothing here writes to the document on its own.
 */
export function LayersPanel({ variant = "popover", onClose }: LayersPanelProps) {
  const ed = useEditor();
  const rows = useMemo(() => layerRows(ed.doc), [ed.doc]);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const selectionKey = ed.selection?.blockKey ?? null;
  /* A canonical document has no Magic block list of its own: the panel states
     that instead of offering arrows the renderer would ignore. */
  const readOnly = !!ed.canonicalDocument;
  const touch = variant === "sheet";
  const count = rows.length === 1 ? "1 bloque" : `${rows.length} bloques`;

  return (
    <div
      data-layers-panel={variant}
      role="dialog"
      aria-label="Capas de la plantilla"
      className={cx(
        "flex flex-col bg-white text-ink",
        variant === "sheet"
          ? "max-h-[78vh] rounded-t-[24px] border-t border-line shadow-toolbar"
          : "max-h-[440px] w-[330px] rounded-2xl border border-line shadow-toolbar",
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight">Capas</p>
          <p className="text-[11.5px] leading-tight text-mute">
            {readOnly ? "Solo lectura en este documento" : count}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Cerrar Capas"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-mute transition-colors duration-150 hover:bg-[#F2F3F5] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </header>

      <ul data-layers-list className="min-h-0 flex-1 overflow-y-auto p-2">
        {rows.map((row, index) => {
          const Icon = blockIcons.get(row.type) ?? LayersIcon;
          const name = layerRowName(row);
          const selected = row.key === selectionKey;
          const confirming = confirmKey === row.key;
          return (
            <li
              key={row.key}
              data-layer-row={row.key}
              data-layer-locked={row.locked ? "true" : "false"}
              className="mb-1 last:mb-0"
            >
              <div
                className={cx(
                  "flex items-center gap-0.5 rounded-xl border px-1.5 py-1",
                  selected
                    ? "border-select bg-select-soft"
                    : "border-transparent hover:bg-[#F7F8FA]",
                )}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Seleccionar ${name}`}
                  data-layer-select={row.key}
                  onClick={() => ed.select(blockPropsKey(row.key), { reveal: true })}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select"
                >
                  <Icon className="h-4 w-4 shrink-0 text-mute" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{name}</span>
                  {row.hidden && (
                    <EyeOffIcon
                      aria-label="Bloque oculto"
                      className="h-3.5 w-3.5 shrink-0 text-mute"
                    />
                  )}
                  {row.locked && (
                    <LockIcon
                      aria-label="Bloque protegido"
                      className="h-3.5 w-3.5 shrink-0 text-select"
                    />
                  )}
                </button>
                <RowButton
                  testId="up"
                  touch={touch}
                  label={`Subir ${name}`}
                  icon={ArrowUpIcon}
                  disabled={readOnly || row.locked || index === 0}
                  onClick={() => ed.moveBlock(row.key, -1)}
                />
                <RowButton
                  testId="down"
                  touch={touch}
                  label={`Bajar ${name}`}
                  icon={ArrowDownIcon}
                  disabled={readOnly || row.locked || index === rows.length - 1}
                  onClick={() => ed.moveBlock(row.key, 1)}
                />
                <RowButton
                  testId="lock"
                  touch={touch}
                  label={row.locked ? `Desbloquear ${name}` : `Bloquear ${name}`}
                  icon={row.locked ? LockIcon : UnlockIcon}
                  active={row.locked}
                  disabled={readOnly}
                  onClick={() =>
                    ed.setProp(blockPropsKey(row.key), "locked", row.locked ? "false" : "true")
                  }
                />
                <RowButton
                  testId="delete"
                  touch={touch}
                  label={`Eliminar ${name}`}
                  icon={Trash2Icon}
                  danger
                  disabled={readOnly || row.locked}
                  onClick={() => setConfirmKey(confirming ? null : row.key)}
                />
              </div>

              {confirming && (
                <div
                  data-layer-confirm={row.key}
                  className="mt-1 rounded-xl border border-[#FBD5C4] bg-[#FFF7F2] p-3"
                >
                  <p className="text-[12.5px] font-semibold text-ink">Eliminar bloque</p>
                  <p className="mt-0.5 text-[12px] text-mute">
                    ¿Quieres eliminar este bloque de la plantilla?
                  </p>
                  <p className="mt-1 text-[11.5px] text-mute">
                    Se quitará «{name}». Podrás deshacerlo.
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      data-layer-confirm-cancel
                      onClick={() => setConfirmKey(null)}
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-line bg-white text-[12.5px] font-medium text-ink transition-colors duration-150 hover:bg-[#F7F8FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      data-layer-confirm-accept
                      onClick={() => {
                        setConfirmKey(null);
                        ed.deleteBlock(row.key);
                      }}
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-[#C2410C] text-[12.5px] font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2410C] focus-visible:ring-offset-1"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
