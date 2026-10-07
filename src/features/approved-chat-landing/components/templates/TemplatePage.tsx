import React from 'react';
import { motion } from 'framer-motion';
import { TemplateHero } from './TemplateHero';
import { TemplateBlock } from './TemplateBlock';
import { themeVars } from '../../utils/templateStyle';
import { blockLabels } from '../../data/templates';
import { contentForPack } from '../../utils/templates';
import type { PageContent, Section, TemplateFamily } from '../../types/cripqer';

export const PAGE_WIDTH = 390;

export function pageSections(t: TemplateFamily): {key: string;block: string;section?: Section;}[] {
  return [{ key: 'hero', block: 'hero' }, ...t.sections.map((s, i) => ({ key: `${i}-${s.block}`, block: s.block, section: s }))];
}

interface TemplatePageProps {
  template: TemplateFamily;
  content?: PageContent | undefined;
  hiddenBlocks?: string[] | undefined;
  reveal?: number | undefined;
  selectedKey?: string | null | undefined;
  onSelectBlock?: ((key: string) => void) | undefined;
}

export function TemplatePage({ template, content, hiddenBlocks = [], reveal, selectedKey, onSelectBlock }: TemplatePageProps) {
  const c = content ?? contentForPack(template);
  const editable = Boolean(onSelectBlock);

  const sections = pageSections(template).
  filter((s) => !hiddenBlocks.includes(s.key)).
  map((s) => ({
    ...s,
    node: s.section ? <TemplateBlock section={s.section} template={template} content={c} /> : <TemplateHero template={template} content={c} />
  }));

  return (
    <div style={{ ...themeVars(template), width: PAGE_WIDTH }} className="pb-12">
      {sections.map((s, i) => {
        const label = blockLabels[s.block] ?? s.block;
        const inner = editable ?
        <div
          role="button"
          tabIndex={0}
          aria-label={`Editar ${label}`}
          onClick={() => onSelectBlock?.(s.key)}
          onKeyDown={(e) => e.key === 'Enter' && onSelectBlock?.(s.key)}
          className={`relative cursor-pointer outline-none transition-[box-shadow] duration-150 ${
          selectedKey === s.key ?
          'shadow-[inset_0_0_0_2px_#0D4AA1]' :
          'hover:shadow-[inset_0_0_0_1.5px_rgba(13,74,161,0.45)] focus-visible:shadow-[inset_0_0_0_2px_#0D4AA1]'}`
          }>
          
            {selectedKey === s.key &&
          <span className="absolute left-2 top-2 z-10 rounded-md bg-[#0D4AA1] px-2 py-0.5 font-sans text-[11px] font-semibold text-white">{label}</span>
          }
            {s.node}
          </div> :

        s.node;

        if (reveal === undefined) return <div key={s.key}>{inner}</div>;
        return (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 14 }}
            animate={i < reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}>
            
            {inner}
          </motion.div>);

      })}
      <footer className="mt-14 text-center text-[11px] opacity-50">Hecho con Cripqer</footer>
    </div>);

}