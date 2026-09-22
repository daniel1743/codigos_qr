import React from 'react';
import { PanelRightIcon, SlidersHorizontalIcon } from 'lucide-react';
import { useEditor } from '../contexts/EditorContext';
import { cn } from '../utils/cn';

export function TopBar() {
  const { products, setPublishWarning, inspectorOpen, setInspectorOpen, mode, setMode, clearSelection } = useEditor();

  return (
    <header
      data-chrome="true"
      className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-canvas/92 px-4 backdrop-blur-md sm:px-6">
      
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink text-[13px] font-semibold text-white">
          C
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-[15.5px] leading-tight text-ink">Cripqer</p>
          <p className="truncate text-[12px] text-muted">
            Catálogo · {products.length} productos
          </p>
        </div>
      </div>

      <div className="hidden flex-1 justify-center sm:flex">
        <div className="flex rounded-lg bg-[#EAE7E1] p-0.5">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={cn(
              'rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-150',
              mode === 'edit' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
            )}>
            Editar
          </button>
          <button
            type="button"
            onClick={() => {
              clearSelection();
              setMode('preview');
            }}
            className={cn(
              'rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-150',
              mode === 'preview' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
            )}>
            Vista previa
          </button>
        </div>
      </div>

      <div className="flex flex-1 shrink-0 items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setInspectorOpen(!inspectorOpen)}
          aria-pressed={inspectorOpen}
          className={cn(
            'hidden h-10 items-center gap-2 rounded-xl border px-3 text-[13px] font-medium transition-colors duration-150 ease-premium lg:flex',
            inspectorOpen ?
            'border-sel bg-selSoft text-sel' :
            'border-hairline text-body hover:bg-surface hover:text-ink'
          )}>
          
          <SlidersHorizontalIcon className="h-4 w-4" strokeWidth={1.7} />
          Ajustes avanzados
        </button>
        <button
          type="button"
          onClick={() => setInspectorOpen(!inspectorOpen)}
          aria-label="Ajustes avanzados"
          className="grid h-11 w-11 place-items-center rounded-xl border border-hairline text-body transition-colors duration-150 ease-premium hover:bg-surface lg:hidden">
          
          <PanelRightIcon className="h-[18px] w-[18px]" strokeWidth={1.7} />
        </button>
        <button
          type="button"
          onClick={() => setPublishWarning(true)}
          className="h-11 rounded-xl bg-ink px-4 text-[13.5px] font-medium text-white transition-colors duration-150 ease-premium hover:bg-black lg:h-10">
          
          Publicar
        </button>
      </div>
    </header>);

}