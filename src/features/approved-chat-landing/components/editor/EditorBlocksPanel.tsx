import React from 'react';
import { EyeIcon, EyeOffIcon, GripVerticalIcon } from 'lucide-react';
import { blockLabels, layoutLabels } from '../../data/templates';
import { pageSections } from '../templates/TemplatePage';
import type { TemplateFamily } from '../../types/cripqer';

interface EditorBlocksPanelProps {
  template: TemplateFamily;
  hidden: string[];
  selected: string | null;
  onToggle: (key: string) => void;
  onSelect: (key: string) => void;
}

export function EditorBlocksPanel({ template, hidden, selected, onToggle, onSelect }: EditorBlocksPanelProps) {
  const swatches = [template.palette.bg, template.palette.surface, template.palette.text, template.palette.accent];

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-2 pt-5">
        <h2 className="text-[12px] font-semibold text-muted">Bloques</h2>
      </div>
      <ul className="flex flex-col gap-0.5 px-2">
        {pageSections(template).map(({ key, block, section }) => {
          const isHidden = hidden.includes(key);
          const label = blockLabels[block] ?? block;
          const detail = block === 'hero' ? template.hero.variant : section?.layout ? layoutLabels[section.layout] : null;
          return (
            <li key={key}>
              <div className={`flex h-11 items-center gap-2 rounded-[12px] pl-2 pr-1 transition-colors duration-150 ${selected === key ? 'bg-brand-blue-soft' : 'hover:bg-subtle'}`}>
                <GripVerticalIcon className="h-4 w-4 shrink-0 text-muted/50" aria-hidden />
                <button
                  type="button"
                  onClick={() => onSelect(key)}
                  className={`min-w-0 flex-1 truncate text-left text-[13.5px] font-medium ${isHidden ? 'text-muted line-through' : selected === key ? 'text-brand-blue' : 'text-ink'}`}>
                  
                  {label}
                  {detail && <span className="ml-1.5 font-normal text-muted">· {detail}</span>}
                </button>
                {block !== 'hero' &&
                <button
                  type="button"
                  onClick={() => onToggle(key)}
                  aria-label={isHidden ? `Mostrar ${label}` : `Ocultar ${label}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-white hover:text-ink">
                  
                    {isHidden ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                }
              </div>
            </li>);

        })}
      </ul>

      <div className="mt-6 border-t border-line px-4 pt-5">
        <h2 className="text-[12px] font-semibold text-muted">Estilo</h2>
        <p className="mt-2 text-[14px] font-semibold text-ink">{template.name}</p>
        <p className="text-[12.5px] text-muted">{template.font.label}</p>
        <div className="mt-3 flex gap-1.5">
          {swatches.map((c, i) =>
          <span key={i} className="h-6 w-6 rounded-full shadow-[inset_0_0_0_1px_rgba(15,26,46,0.12)]" style={{ background: c }} />
          )}
        </div>
      </div>
    </div>);

}