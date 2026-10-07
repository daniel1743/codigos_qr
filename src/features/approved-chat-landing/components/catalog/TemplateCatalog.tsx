import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { TemplateCard } from '../templates/TemplateCard';
import { moodFilters, templates } from '../../data/templates';
import { getBusinessType, getTemplate, resolveContent } from '../../utils/templates';
import { rankFamilies } from '../../utils/recommend';
import type { BusinessContext, TemplateId } from '../../types/cripqer';

interface TemplateCatalogProps {
  context: BusinessContext;
  onPreview: (id: TemplateId) => void;
  onSelect: (id: TemplateId) => void;
  onClose: () => void;
}

export function TemplateCatalog({ context, onPreview, onSelect, onClose }: TemplateCatalogProps) {
  const type = getBusinessType(context.businessIdentity.type);
  const [tab, setTab] = useState<'recommended' | 'all'>('recommended');
  const [mood, setMood] = useState('all');
  const selectedId = context.template.selectedTemplateId;

  const recommended = useMemo<TemplateId[]>(() => {
    if (type) return rankFamilies(context).ranked.slice(0, 6);
    return context.session.initialTemplates.length ? context.session.initialTemplates : templates.slice(0, 6).map((t) => t.id);
  }, [type, context]);

  const all = useMemo(() => {
    const f = moodFilters.find((m) => m.id === mood);
    if (!f || f.tags.length === 0) return templates.map((t) => t.id);
    return templates.filter((t) => t.tags.some((tag) => f.tags.includes(tag))).map((t) => t.id);
  }, [mood]);

  const ids = tab === 'recommended' ? recommended : all;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5">
        <div>
          <h2 className="font-display text-[18px] font-bold text-ink">Plantillas</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {tab === 'recommended' ?
            type ?
            `Pensadas para ${type.label.toLowerCase()}` :
            'Las que viste al entrar' :
            `${templates.length} estilos base, todos editables`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar plantillas"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-subtle hover:text-ink">
          
          <XIcon className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="px-5">
        <div role="tablist" className="relative flex rounded-full bg-subtle p-1">
          {(['recommended', 'all'] as const).map((t) =>
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            type="button"
            onClick={() => setTab(t)}
            className={`relative z-10 h-8 flex-1 rounded-full text-[13px] font-medium transition-colors duration-150 ${tab === t ? 'text-ink' : 'text-muted hover:text-ink'}`}>
            
              {tab === t &&
            <motion.span
              layoutId="catalog-tab"
              className="absolute inset-0 -z-10 rounded-full bg-white shadow-sm"
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} />

            }
              {t === 'recommended' ? 'Recomendadas' : 'Todas'}
            </button>
          )}
        </div>
        {tab === 'all' &&
        <div className="no-scrollbar -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5">
            {moodFilters.map((m) =>
          <button
            key={m.id}
            type="button"
            onClick={() => setMood(m.id)}
            className={`h-8 shrink-0 rounded-full px-3 text-[12.5px] font-medium transition-colors duration-150 ${
            mood === m.id ? 'bg-ink text-white' : 'text-muted hover:bg-subtle hover:text-ink'}`
            }>
            
                {m.label}
              </button>
          )}
          </div>
        }
      </div>

      <div className="mt-4 flex-1 overflow-y-auto px-5 pb-8">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
          {ids.map((id) => {
            const selected = selectedId === id;
            return (
              <TemplateCard
                key={id}
                template={getTemplate(id)}
                content={resolveContent(getTemplate(id), context)}
                selected={selected}
                onOpen={() => onPreview(id)}
                frameClassName="h-[230px]"
                compactLabel
                footer={
                <button
                  type="button"
                  onClick={() => onSelect(id)}
                  disabled={selected}
                  className={`mt-2 h-8 w-full rounded-full text-[12.5px] font-semibold transition-[background-color,color] duration-150 ${
                  selected ? 'bg-brand-gold-soft text-ink' : 'text-ink shadow-[0_0_0_1px_rgba(15,26,46,0.12)] hover:bg-ink hover:text-white'}`
                  }>
                  
                    {selected ? 'Elegida' : 'Usar este estilo'}
                  </button>
                } />);


          })}
        </div>
      </div>
    </div>);

}