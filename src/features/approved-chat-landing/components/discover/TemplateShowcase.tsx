import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TemplateCard } from '../templates/TemplateCard';
import { contentForPack, getTemplate } from '../../utils/templates';
import type { TemplateId } from '../../types/cripqer';

interface TemplateShowcaseProps {
  slots: TemplateId[];
  packId: string | null;
  onOpen: (id: TemplateId) => void;
  setPaused: (p: boolean) => void;
  previewOpen: boolean;
}

// Subtle concave arc: outer previews turn slightly toward the viewer.
const TILT = [7, 3, 0, -3, -7];

export function TemplateShowcase({ slots, packId, onOpen, setPaused, previewOpen }: TemplateShowcaseProps) {
  const [hovered, setHovered] = useState(false);
  useEffect(() => setPaused(hovered || previewOpen), [hovered, previewOpen, setPaused]);

  return (
    <motion.section
      aria-label="Estilos que puedes crear"
      exit={{ opacity: 0, y: -24, scale: 0.98, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="no-scrollbar -mx-5 flex h-full snap-x snap-mandatory gap-3 overflow-x-auto px-5 md:mx-0 md:gap-4 md:overflow-visible md:px-0 md:[perspective:1800px]">
      
      {slots.map((id, i) => {
        const tpl = getTemplate(id);
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.06 + i * 0.05, ease: [0.23, 1, 0.32, 1] }}
            className="h-full w-[64vw] max-w-[260px] shrink-0 snap-center md:w-auto md:max-w-none md:flex-1">
            
            <div className="h-full md:[transform:var(--tilt)]" style={{ ['--tilt' as string]: `rotateY(${TILT[i]}deg)` }}>
              <TemplateCard
                template={tpl}
                content={contentForPack(tpl, packId)}
                onOpen={() => onOpen(id)}
                hideLabel
                className="h-full"
                frameClassName="h-full w-full" />
              
            </div>
          </motion.div>);

      })}
    </motion.section>);

}