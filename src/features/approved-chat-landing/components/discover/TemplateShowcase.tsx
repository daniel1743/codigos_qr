import React, { useEffect, useRef, useState } from 'react';
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

// The desktop row shows four of the five rotation slots; the fifth stays in the
// mobile carousel only, so the approved mobile behaviour is untouched.
const DESKTOP_CARDS = 4;

// Subtle concave arc: outer previews turn slightly toward the viewer (desktop only).
// Symmetric around the row so the four centred cards stay balanced.
const desktopTilt = (i: number) => (i - (DESKTOP_CARDS - 1) / 2) * -4;

// Mobile carousel: the centred card keeps full weight while its neighbours step
// back, so the strip always reads as one protagonist template plus a discreet
// peek of the next one. These scales are tuned so the visible sliver of the next
// card stays around 6% of its width at every mobile viewport.
const NEIGHBOUR_SCALE = 0.93;
const FAR_SCALE = 0.89;

export function TemplateShowcase({ slots, packId, onOpen, setPaused, previewOpen }: TemplateShowcaseProps) {
  const [hovered, setHovered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const strip = useRef<HTMLElement | null>(null);
  useEffect(() => setPaused(hovered || previewOpen), [hovered, previewOpen, setPaused]);

  /*
   * The mobile strip is a snap carousel, so the active card is whichever child
   * sits closest to the centre of the scrollport. Recomputing that on scroll and
   * resize drives the focus scale without pulling in a carousel dependency.
   */
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const syncActive = () => {
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < el.children.length; i += 1) {
        const child = el.children[i] as HTMLElement;
        const distance = Math.abs(child.offsetLeft + child.offsetWidth / 2 - center);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      }
      setActiveIndex(best);
    };
    syncActive();
    el.addEventListener('scroll', syncActive, { passive: true });
    window.addEventListener('resize', syncActive);
    return () => {
      el.removeEventListener('scroll', syncActive);
      window.removeEventListener('resize', syncActive);
    };
  }, [slots.length]);

  return (
    <motion.section
      ref={strip}
      data-showcase-row=""
      aria-label="Estilos que puedes crear"
      exit={{ opacity: 0, y: -24, scale: 0.98, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="no-scrollbar relative -mx-5 flex h-full snap-x snap-mandatory gap-0 overflow-x-auto px-[8vw] md:mx-0 md:gap-4 md:overflow-visible md:px-0 md:[perspective:1800px]">
      
      {slots.map((id, i) => {
        const tpl = getTemplate(id);
        const distance = Math.abs(i - activeIndex);
        const focusScale = distance === 0 ? 1 : distance === 1 ? NEIGHBOUR_SCALE : FAR_SCALE;
        return (
          <motion.div
            key={i}
            data-showcase-card=""
            data-slot-hidden={i >= DESKTOP_CARDS ? '' : undefined}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.06 + i * 0.05, ease: [0.23, 1, 0.32, 1] }}
            className="h-full w-[84vw] max-w-[390px] shrink-0 snap-center md:w-auto md:max-w-none md:flex-1">
            
            {/* `scale` is the standalone CSS property, so it never fights the
                framer-motion transform above nor the desktop tilt below. */}
            <div
              className="h-full w-full scale-[var(--focus-scale)] transition-[scale] duration-[350ms] ease-[cubic-bezier(0.23,1,0.32,1)] md:scale-none"
              style={{ ['--focus-scale' as string]: String(focusScale) }}>

              <div className="h-full md:[transform:var(--tilt)]" style={{ ['--tilt' as string]: `rotateY(${desktopTilt(i)}deg)` }}>
                <TemplateCard
                  template={tpl}
                  content={contentForPack(tpl, packId)}
                  onOpen={() => onOpen(id)}
                  hideLabel
                  className="h-full"
                  frameClassName="h-full w-full" />
              
              </div>
            </div>
          </motion.div>);

      })}
    </motion.section>);

}