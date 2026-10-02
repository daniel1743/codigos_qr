import React, { useState } from 'react';
import { toast } from 'sonner';
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, CopyIcon, PlusIcon, StarIcon, Trash2Icon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { PanelSection } from './controls/PanelSection';
import { ScopeNote } from './controls/ScopeNote';
import { iconForId } from './controls/IconPicker';
import { cx } from '../../utils/cx';
import {
  buttonIdentity,
  canonicalScope,
  destinationSummary,
  nextButtonId,
  normalizeButtonIcon,
  readButtonGroup,
  suggestButtonIcon,
  type LegacyButtonSeed } from
'../../utils/buttonGroup';
import { addButton, deleteButton, duplicateButton, moveButton } from '../../utils/buttonOps';

interface ButtonRosterProps {
  blockKey: string;
  seeds: LegacyButtonSeed[];
}

const ROW_ACTION =
  'grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-white text-ink transition-colors duration-150 hover:bg-[#F7F8FA] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1';

/** «Gestionar»: one place to understand and manage the whole collection. */
export function ButtonRoster({ blockKey, seeds }: ButtonRosterProps) {
  const ed = useEditor();
  const [confirming, setConfirming] = useState<string | null>(null);
  const collection = { blockKey, seeds };
  const model = readButtonGroup(ed.doc, blockKey, seeds);
  const total = model.items.length;

  const add = () => {
    const stableId = nextButtonId(readButtonGroup(ed.doc, blockKey, seeds));
    ed.updateDoc((doc) => addButton(doc, collection));
    toast('Botón añadido', { action: { label: 'Deshacer', onClick: () => ed.undo() } });
    // The new button must exist in the DOM before it can be selected.
    window.setTimeout(() => ed.select(canonicalScope(blockKey, stableId), { reveal: true }), 80);
  };

  const duplicate = (stableId: string) => {
    ed.updateDoc((doc) => duplicateButton(doc, collection, stableId));
    toast('Botón duplicado', { action: { label: 'Deshacer', onClick: () => ed.undo() } });
  };

  const remove = (stableId: string) => {
    const before = ed.doc;
    let changed = false;
    ed.updateDoc((doc) => {
      const next = deleteButton(doc, collection, stableId);
      changed = next !== doc;
      return next;
    });
    if (!changed && ed.doc === before) return;
    toast('Botón eliminado', { action: { label: 'Deshacer', onClick: () => ed.undo() } });
  };

  return (
    <div className="space-y-4">
      <ScopeNote scope="group" count={total} />
      <PanelSection title={`Gestionar botones · ${total}`} hint="Orden, contenido y destinos de todo el grupo.">
        <button
          type="button"
          onClick={add}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[12.5px] font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-2">
          <PlusIcon className="h-4 w-4" /> Añadir botón
        </button>

        <ul className="mt-3 space-y-2">
          {total === 0 &&
          <li className="rounded-xl border border-dashed border-line px-3 py-6 text-center">
              <p className="text-[12.5px] font-medium text-ink-soft">Este grupo no tiene botones.</p>
              <p className="mt-0.5 text-[11.5px] text-mute">Usa «Añadir botón» para crear el primero.</p>
            </li>}
          {model.items.map((item, index) => {
            const identity = buttonIdentity(model, item.stableId);
            const iconId = normalizeButtonIcon(item.icon) ?? suggestButtonIcon(item.href, item.label);
            const Icon = iconForId(iconId);
            const primary = item.isPrimary === 'on';
            const summary = destinationSummary(ed.doc.props[item.scope]?.['href'] ?? item.href);
            const confirmingThis = confirming === item.stableId;
            return (
              <li
                key={item.stableId}
                className={cx('rounded-xl border border-line bg-white p-2', confirmingThis && 'border-[#E4A38A] bg-[#FFF9F6]')}>
                {confirmingThis ?
                <div className="flex flex-wrap items-center gap-2 p-1">
                    <span className="flex-1 text-[12.5px] font-medium text-ink">¿Eliminar «{item.label}»?</span>
                    <button
                    type="button"
                    onClick={() => {
                      setConfirming(null);
                      remove(item.stableId);
                    }}
                    className="h-10 rounded-xl bg-[#C2410C] px-3 text-[12.5px] font-semibold text-white hover:opacity-90">
                      Sí, eliminar
                    </button>
                    <button type="button" onClick={() => setConfirming(null)} className={cx(ROW_ACTION, 'w-auto px-3')}>
                      Cancelar
                    </button>
                  </div> :
                <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#F2F3F5] text-[12px] font-semibold text-ink">
                      {index + 1}
                    </span>
                    <button
                    type="button"
                    onClick={() => ed.select(item.scope, { reveal: true })}
                    aria-label={`Editar ${identity.identity}`}
                    className="min-w-0 flex-1 rounded-xl px-1 py-1.5 text-left transition-colors duration-150 hover:bg-[#F7F8FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1">
                      <span className="flex items-center gap-1.5">
                        <Icon className="h-4 w-4 shrink-0 text-ink-soft" strokeWidth={1.7} />
                        <span className="truncate text-[13px] font-medium text-ink">{item.label}</span>
                        {primary &&
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFF4E5] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#8A5300]">
                            <StarIcon className="h-3 w-3" /> Principal
                          </span>}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-mute">
                        Posición {index + 1} de {total} · {summary}
                      </span>
                    </button>
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Mover ${identity.identity} arriba`}
                        title="Mover arriba"
                        disabled={index === 0}
                        onClick={() => ed.updateDoc((doc) => moveButton(doc, collection, item.stableId, -1))}
                        className={ROW_ACTION}>
                        <ArrowUpIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Mover ${identity.identity} abajo`}
                        title="Mover abajo"
                        disabled={index >= total - 1}
                        onClick={() => ed.updateDoc((doc) => moveButton(doc, collection, item.stableId, 1))}
                        className={ROW_ACTION}>
                        <ArrowDownIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Duplicar ${identity.identity}`}
                        title="Duplicar"
                        onClick={() => duplicate(item.stableId)}
                        className={ROW_ACTION}>
                        <CopyIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Eliminar ${identity.identity}`}
                        title="Eliminar"
                        onClick={() => setConfirming(item.stableId)}
                        className={cx(ROW_ACTION, 'text-[#C2410C] hover:bg-[#FFF4EE]')}>
                        <Trash2Icon className="h-4 w-4" />
                      </button>
                    </span>
                  </div>}
              </li>);
          })}
        </ul>
        
      </PanelSection>
    </div>);
}
