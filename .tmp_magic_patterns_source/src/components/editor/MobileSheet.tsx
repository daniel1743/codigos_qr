import React from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { ChevronLeftIcon, ChevronUpIcon, EllipsisIcon, XIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { useSelectionActions } from './useSelectionActions';
import { AdvancedPanel } from './AdvancedPanel';
import { kindIcons, type EditorAction } from './editorAction';
import { cx } from '../../utils/cx';
import { keepFocus } from '../../utils/styles';

const ease = [0.23, 1, 0.32, 1] as const;

function SheetTile({ action, onPress }: {action: Pick<EditorAction, 'label' | 'icon' | 'active' | 'danger' | 'disabled' | 'swatch'>;onPress: () => void;}) {
  const Icon = action.icon;
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={action.disabled}
      className={cx(
        'flex min-h-[68px] min-w-[70px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-2 text-[11.5px] font-medium transition-colors duration-150 active:scale-[0.97] disabled:opacity-35',
        action.active ? 'bg-select-soft text-select' : action.danger ? 'bg-[#FFF4EE] text-[#C2410C]' : 'bg-[#F4F5F7] text-ink'
      )}>
      
      <span className="relative">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
        {action.swatch && <span className="absolute -bottom-1 -right-1.5 h-2.5 w-2.5 rounded-full border border-white" style={{ background: action.swatch }} />}
      </span>
      <span className="whitespace-nowrap">{action.label}</span>
    </button>);

}

/** Mobile: the selected object stays visible above a contextual bottom sheet with obvious, touch-sized actions. */
export function MobileSheet() {
  const ed = useEditor();
  const sel = ed.selection;
  const actions = useSelectionActions().filter((a) => !a.desktopOnly);
  const controls = useDragControls();
  const open = !!sel && ed.mode === 'edit' && !ed.keyboard && !ed.picker.open && !ed.settingsOpen;
  const expanded = ed.sheet === 'expanded';
  const panelAction = actions.find((a) => a.key === ed.sheetPanel && a.panel);
  const parent = sel?.parentId ? ed.getInfo(sel.parentId) : null;

  const press = (a: EditorAction) => {
    if (a.onClick) {
      a.onClick();
      return;
    }
    if (a.panel) {
      ed.setSheetPanel(a.key);
      ed.setSheet('expanded');
    }
  };

  return (
    <AnimatePresence>
      {open && sel &&
      <motion.div
        key="sheet"
        role="dialog"
        aria-label={`Editar ${sel.label}`}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.06, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.y < -40) ed.setSheet('expanded');else
          if (info.offset.y > 60) {
            if (expanded) {
              ed.setSheet('compact');
              ed.setSheetPanel(null);
            } else ed.clearSelection();
          }
        }}
        onMouseDown={keepFocus}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.26, ease }}
        className="absolute inset-x-0 bottom-0 z-40 flex flex-col rounded-t-[24px] bg-white text-ink shadow-[0_-14px_40px_-14px_rgba(16,24,40,0.3)]"
        style={{ height: expanded && !panelAction ? '74%' : undefined, maxHeight: '78%' }}>
        
          <div className="flex touch-none justify-center pb-1.5 pt-2.5" onPointerDown={(e) => controls.start(e)}>
            <button
            type="button"
            aria-label={expanded ? 'Contraer panel' : 'Expandir panel'}
            onClick={() => {
              ed.setSheet(expanded ? 'compact' : 'expanded');
              if (expanded) ed.setSheetPanel(null);
            }}
            className="h-1.5 w-10 rounded-full bg-[#D5D8DD]" />
          
          </div>

          <header className="flex items-center gap-3 px-4 pb-3">
            {panelAction ?
          <button type="button" aria-label="Volver" onClick={() => ed.setSheetPanel(null)} className="grid h-10 w-10 place-items-center rounded-xl bg-[#F4F5F7]">
                <ChevronLeftIcon className="h-5 w-5" />
              </button> :

          <span className="grid h-10 w-10 place-items-center rounded-xl bg-select-soft text-select">
                {React.createElement(kindIcons[sel.kind], { className: 'h-5 w-5', strokeWidth: 1.8 })}
              </span>
          }
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold leading-tight">{panelAction ? panelAction.label : sel.label}</p>
              {!panelAction && parent && parent.kind !== 'page' ?
            <button type="button" onClick={() => ed.select(parent.id)} className="mt-0.5 text-[12.5px] font-medium text-select">
                  Dentro de {parent.label} · seleccionar
                </button> :

            <p className="mt-0.5 text-[12.5px] text-mute">{panelAction ? sel.label : 'Toca una acción'}</p>
            }
            </div>
            <button type="button" aria-label="Cerrar" onClick={ed.clearSelection} className="grid h-10 w-10 place-items-center rounded-full bg-[#F4F5F7]">
              <XIcon className="h-5 w-5" />
            </button>
          </header>

          {panelAction ?
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">{panelAction.panel}</div> :

        <>
              <div className="cq-scroll-none flex gap-2 overflow-x-auto px-4 pb-4">
                {actions.map((a) =>
            <SheetTile key={a.key} action={a} onPress={() => press(a)} />
            )}
                <SheetTile
              action={{ label: expanded ? 'Menos' : 'Más', icon: expanded ? ChevronUpIcon : EllipsisIcon, active: expanded }}
              onPress={() => ed.setSheet(expanded ? 'compact' : 'expanded')} />
            
              </div>
              {expanded &&
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-line px-4 pb-8 pt-4">
                  <AdvancedPanel />
                </div>
          }
            </>
        }
        </motion.div>
      }
    </AnimatePresence>);

}