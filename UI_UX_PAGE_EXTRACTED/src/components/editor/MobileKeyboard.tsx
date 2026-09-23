import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BoldIcon, CornerDownLeftIcon, DeleteIcon, MinusIcon, PlusIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { alignOptions } from './controls/AlignGroup';
import { cx } from '../../utils/cx';

const rows = ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm'];
const ease = [0.23, 1, 0.32, 1] as const;

function insert(text: string) {
  document.execCommand('insertText', false, text);
}

/** Keyboard-safe editing: a format bar docks above the keyboard, and the text being edited is scrolled above both. */
export function MobileKeyboard() {
  const ed = useEditor();
  const t = useThemeTokens();
  const id = ed.editingId;
  const open = ed.keyboard && !!id && ed.mode === 'edit';
  const showKeys = !ed.isSmallScreen;
  const el = id ? document.querySelector<HTMLElement>('[contenteditable="true"]') : null;
  const cs = el ? window.getComputedStyle(el) : null;
  const ts = id ? ed.doc.textStyles[id] ?? {} : {};
  const size = ts.size ?? Math.round(parseFloat(cs?.fontSize ?? '16'));
  const bold = ts.bold ?? (cs ? parseInt(cs.fontWeight, 10) >= 600 : false);
  const alignIndex = Math.max(0, alignOptions.findIndex((o) => o.value === (ts.align ?? (cs?.textAlign === 'center' ? 'center' : cs?.textAlign === 'right' ? 'right' : 'left'))));
  const AlignIcon = alignOptions[alignIndex].icon;
  const label = id ? ed.getInfo(id)?.label ?? 'Texto del botón' : '';

  const key = 'grid h-[42px] flex-1 place-items-center rounded-[6px] bg-white text-[17px] text-ink shadow-[0_1px_0_rgba(0,0,0,0.25)] active:bg-[#E5E7EB]';
  const fmt = 'grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink transition-colors duration-150 active:bg-[#E8EAEE]';

  return (
    <AnimatePresence>
      {open && id &&
      <motion.div
        key="keyboard"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.24, ease }}
        className="absolute inset-x-0 bottom-0 z-50">
        
          <div className="border-t border-line bg-white">
            <p className="px-4 pt-2 text-[11.5px] font-medium text-mute">Editando · {label}</p>
            <div className="flex items-center gap-0.5 px-2 pb-1.5 pt-1">
              <button type="button" aria-label="Negrita" aria-pressed={bold} className={cx(fmt, bold && 'bg-select-soft text-select')} onClick={() => ed.setTextStyle(id, { bold: !bold })}>
                <BoldIcon className="h-[18px] w-[18px]" />
              </button>
              <button type="button" aria-label="Reducir tamaño" className={fmt} onClick={() => ed.setTextStyle(id, { size: Math.max(10, size - 2) })}>
                <MinusIcon className="h-4 w-4" />
              </button>
              <span className="w-7 text-center text-[13px] font-medium tabular-nums">{size}</span>
              <button type="button" aria-label="Aumentar tamaño" className={fmt} onClick={() => ed.setTextStyle(id, { size: Math.min(140, size + 2) })}>
                <PlusIcon className="h-4 w-4" />
              </button>
              <button
              type="button"
              aria-label="Cambiar alineación"
              className={fmt}
              onClick={() => ed.setTextStyle(id, { align: alignOptions[(alignIndex + 1) % alignOptions.length].value })}>
              
                <AlignIcon className="h-[18px] w-[18px]" />
              </button>
              <div className="ml-1 flex items-center gap-1.5">
                {t.swatches.slice(0, 3).map((c) =>
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => ed.setTextStyle(id, { color: c })}
                className={cx('h-6 w-6 rounded-full border', ts.color === c ? 'border-select ring-2 ring-select/30' : 'border-black/10')}
                style={{ background: c }} />

              )}
              </div>
              <button
              type="button"
              onClick={() => (document.activeElement as HTMLElement | null)?.blur()}
              className="ml-auto h-9 rounded-full bg-select px-4 text-[13px] font-semibold text-white">
              
                Listo
              </button>
            </div>
          </div>
          {showKeys &&
        <div className="space-y-2.5 bg-[#D1D4DA] px-1 pb-5 pt-2.5" aria-hidden>
              {rows.map((r, i) =>
          <div key={r} className={cx('flex gap-1.5', i === 1 && 'px-3', i === 2 && 'px-9')}>
                  {r.split('').map((ch) =>
            <button key={ch} type="button" tabIndex={-1} className={key} onMouseDown={(e) => {e.preventDefault();insert(ch);}}>
                      {ch}
                    </button>
            )}
                </div>
          )}
              <div className="flex gap-1.5">
                <button type="button" tabIndex={-1} className={cx(key, 'max-w-[56px] bg-[#AEB3BC] text-[14px]')} onMouseDown={(e) => {e.preventDefault();insert(', ');}}>
                  ,
                </button>
                <button type="button" tabIndex={-1} className={cx(key, 'flex-[4] text-[14px] text-mute')} onMouseDown={(e) => {e.preventDefault();insert(' ');}}>
                  espacio
                </button>
                <button type="button" tabIndex={-1} className={cx(key, 'max-w-[56px] bg-[#AEB3BC]')} onMouseDown={(e) => {e.preventDefault();document.execCommand('delete');}}>
                  <DeleteIcon className="h-5 w-5" />
                </button>
                <button type="button" tabIndex={-1} className={cx(key, 'max-w-[64px] bg-[#AEB3BC]')} onMouseDown={(e) => {e.preventDefault();(document.activeElement as HTMLElement | null)?.blur();}}>
                  <CornerDownLeftIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
        }
        </motion.div>
      }
    </AnimatePresence>);

}