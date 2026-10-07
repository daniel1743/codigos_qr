import React from 'react';
import { motion } from 'framer-motion';
import { CheckIcon } from 'lucide-react';
import { TemplateCard } from '../templates/TemplateCard';
import { getTemplate, resolveContent } from '../../utils/templates';
import type { BusinessContext, TemplateId } from '../../types/cripqer';

interface InlineTemplatesProps {
  ids: TemplateId[];
  context: BusinessContext;
  onPreview: (id: TemplateId) => void;
  onSelect: (id: TemplateId) => void;
}

export function InlineTemplates({ ids, context, onPreview, onSelect }: InlineTemplatesProps) {
  const selectedId = context.template.selectedTemplateId;
  return (
    <div className="no-scrollbar -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      {ids.map((id, i) => {
        const selected = selectedId === id;
        const tpl = getTemplate(id);
        return (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
            className="w-[180px] shrink-0 md:w-[204px]">
            
            <TemplateCard
              template={tpl}
              content={resolveContent(tpl, context)}
              index={ids.length > 1 ? i : undefined}
              selected={selected}
              onOpen={() => onPreview(id)}
              frameClassName="h-[250px] md:h-[280px]"
              compactLabel
              footer={
              <button
                type="button"
                onClick={() => onSelect(id)}
                disabled={selected}
                className={`mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-[background-color,color] duration-150 ${
                selected ? 'bg-brand-gold-soft text-ink' : 'bg-white text-ink shadow-[0_0_0_1px_rgba(15,26,46,0.12)] hover:bg-ink hover:text-white'}`
                }>
                
                  {selected ?
                <>
                      <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.5} /> Elegida
                    </> :

                'Usar este estilo'
                }
                </button>
              } />
            
          </motion.div>);

      })}
    </div>);

}