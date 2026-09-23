import React from 'react';
import {
  CheckIcon,
  EyeIcon,
  Loader2Icon,
  MonitorIcon,
  PenLineIcon,
  Redo2Icon,
  Settings2Icon,
  SmartphoneIcon,
  Undo2Icon } from
'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { templateOrder, templates } from '../../data/templates';
import { cx } from '../../utils/cx';
import type { TemplateId } from '../../types/editor';

function IconButton({ label, onClick, disabled, active, children }: {label: string;onClick: () => void;disabled?: boolean;active?: boolean;children: React.ReactNode;}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'grid h-9 w-9 shrink-0 place-items-center rounded-[10px] transition-colors duration-150 disabled:pointer-events-none disabled:opacity-30',
        active ? 'bg-select-soft text-select' : 'text-ink hover:bg-[#F2F3F5]'
      )}>
      
      {children}
    </button>);

}

export function TopBar() {
  const ed = useEditor();
  const meta = templates[ed.templateId];
  const tab = (active: boolean) =>
  cx(
    'flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[8px] px-3 text-[12.5px] font-medium transition-colors duration-150',
    active ? 'bg-white text-ink shadow-[0_1px_2px_rgba(16,24,40,0.1)]' : 'text-mute hover:text-ink'
  );

  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-3 lg:gap-3 lg:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-ink text-[15px] font-bold text-white" aria-label="Cripqer">
          C
        </div>
        <div className="hidden min-w-0 2xl:block">
          <p className="text-[13px] font-semibold leading-tight text-ink">Cripqer</p>
          <p className="truncate text-[11.5px] leading-tight text-mute">cripqer.com/{meta.slug}</p>
        </div>
        <span className="flex h-8 items-center rounded-[8px] bg-white px-3 text-[12.5px] font-medium text-ink shadow-[0_1px_2px_rgba(16,24,40,0.1)]">
          Editor Magic
        </span>
      </div>

      <>
          <div className="mx-auto hidden rounded-[10px] bg-[#F2F3F5] p-0.5 md:flex" role="tablist" aria-label="Plantilla">
            {templateOrder.map((id) =>
          <button key={id} type="button" role="tab" aria-selected={ed.templateId === id} onClick={() => ed.setTemplateId(id)} className={tab(ed.templateId === id)}>
                <span className="hidden lg:inline">{templates[id].name}</span>
                <span className="lg:hidden">{templates[id].short}</span>
              </button>
          )}
          </div>
          <select
          aria-label="Plantilla"
          value={ed.templateId}
          onChange={(e) => ed.setTemplateId(e.target.value as TemplateId)}
          className="h-9 min-w-0 flex-1 rounded-[10px] border border-line bg-white px-2 text-[13px] md:hidden">
          
            {templateOrder.map((id) =>
          <option key={id} value={id}>
                {templates[id].short}
              </option>
          )}
          </select>

          <div className="flex shrink-0 items-center gap-1">
            <div className="mr-1 hidden rounded-[10px] bg-[#F2F3F5] p-0.5 md:flex" role="radiogroup" aria-label="Dispositivo">
              <button type="button" role="radio" aria-checked={ed.device === 'desktop'} aria-label="Escritorio" title="Escritorio" onClick={() => ed.setDevice('desktop')} className={tab(ed.device === 'desktop')}>
                <MonitorIcon className="h-4 w-4" />
              </button>
              <button type="button" role="radio" aria-checked={ed.device === 'mobile'} aria-label="Móvil" title="Móvil" onClick={() => ed.setDevice('mobile')} className={tab(ed.device === 'mobile')}>
                <SmartphoneIcon className="h-4 w-4" />
              </button>
            </div>
            <IconButton label="Deshacer" onClick={ed.undo} disabled={!ed.canUndo || ed.mode === 'preview'}>
              <Undo2Icon className="h-4 w-4" />
            </IconButton>
            <IconButton label="Rehacer" onClick={ed.redo} disabled={!ed.canRedo || ed.mode === 'preview'}>
              <Redo2Icon className="h-4 w-4" />
            </IconButton>
            <span className="hidden w-[92px] items-center gap-1.5 whitespace-nowrap px-1.5 text-[12px] text-mute lg:flex" aria-live="polite">
              {ed.saveState === 'saving' ?
            <>
                  <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Guardando…
                </> :

            <>
                  <CheckIcon className="h-3.5 w-3.5 text-[#16A34A]" /> Guardado
                </>
            }
            </span>
            <IconButton label="Ajustes avanzados de página" onClick={() => ed.setSettingsOpen(true)} active={ed.settingsOpen} disabled={ed.mode === 'preview'}>
              <Settings2Icon className="h-4 w-4" />
            </IconButton>
            <button
            type="button"
            onClick={() => ed.setMode(ed.mode === 'edit' ? 'preview' : 'edit')}
            className={cx(
              'ml-1 inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 text-[13px] font-medium transition-colors duration-150',
              ed.mode === 'preview' ? 'bg-select-soft text-select' : 'text-ink hover:bg-[#F2F3F5]'
            )}>
            
              {ed.mode === 'preview' ? <PenLineIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              <span className="hidden sm:inline">{ed.mode === 'preview' ? 'Editar' : 'Vista previa'}</span>
            </button>
            <button
            type="button"
            onClick={ed.publish}
            disabled={ed.publishing}
            className="ml-1 inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-ink px-4 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-70">
            
              {ed.publishing && <Loader2Icon className="h-3.5 w-3.5 animate-spin" />}
              Publicar
            </button>
          </div>
        </>
    </header>);

}
