import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon } from 'lucide-react';
import { SignatureBorder } from './brand/SignatureBorder';
import { ScaledTemplate } from './templates/ScaledTemplate';
import { getBusinessType, getChannel, getTemplate, resolveContent } from '../utils/templates';
import type { BusinessContext } from '../types/cripqer';

interface GeneratingStageProps {
  context: BusinessContext;
}

const ease = [0.23, 1, 0.32, 1] as const;

export function GeneratingStage({ context }: GeneratingStageProps) {
  const tpl = getTemplate(context.template.selectedTemplateId ?? 'dark_craft');
  const type = getBusinessType(context.businessIdentity.type);
  const channel = getChannel(context.primaryChannel);
  const name = context.businessIdentity.name ?? (type ? `tu ${type.label.toLowerCase()}` : 'tu negocio');
  const [reveal, setReveal] = useState(0);
  const [step, setStep] = useState(0);

  const steps = [`Aplicando el estilo ${tpl.name}`, `Escribiendo los textos de ${name}`, `Conectando tu botón de ${channel?.label ?? 'contacto'}`];

  useEffect(() => {
    const total = tpl.sections.length + 1;
    const timers: number[] = [];
    for (let i = 1; i <= total; i++) timers.push(window.setTimeout(() => setReveal(i), 300 + i * 650));
    [1, 2, 3].forEach((s, i) => timers.push(window.setTimeout(() => setStep(s), 1200 + i * 1100)));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [tpl.sections.length]);

  const done = step >= 3;

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-8 md:flex-row md:gap-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.25 }}>
      
      <motion.div
        layoutId="page-canvas"
        transition={{ duration: 0.3, ease }}
        className="relative h-[52vh] w-[min(260px,70vw)] shrink-0 rounded-[34px] bg-white p-2 shadow-[0_30px_60px_-30px_rgba(15,26,46,0.45)] md:h-[min(620px,72vh)] md:w-[310px]">
        
        <SignatureBorder mode={done ? 'finish' : 'processing'} radius={34} />
        <div className="relative h-full overflow-hidden rounded-[27px]" style={{ background: tpl.palette.bg }}>
          <ScaledTemplate template={tpl} content={resolveContent(tpl, context)} reveal={reveal} />
        </div>
      </motion.div>

      <div className="w-full max-w-[340px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2
            key={done ? 'done' : 'working'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease }}
            className="font-display text-[24px] font-bold leading-tight text-ink md:text-[28px]"
            aria-live="polite">
            
            {done ? 'Tu página está lista.' : 'Preparando tu página…'}
          </motion.h2>
        </AnimatePresence>
        <p className="mt-2 text-[15px] text-muted">Con el estilo que elegiste y lo que me contaste.</p>
        <ul className="mt-7 space-y-3.5">
          {steps.map((s, i) => {
            const complete = step > i;
            const active = step === i;
            return (
              <li key={s} className={`flex items-center gap-3 text-[14.5px] transition-colors duration-200 ${complete || active ? 'text-ink' : 'text-muted/60'}`}>
                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                  {complete ?
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.18, ease }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue">
                    
                      <CheckIcon className="h-3 w-3 text-white" strokeWidth={3} />
                    </motion.span> :

                  <span className={`h-5 w-5 rounded-full border-2 ${active ? 'animate-spin border-brand-gold border-t-transparent' : 'border-line'}`} />
                  }
                </span>
                {s}
              </li>);

          })}
        </ul>
      </div>
    </motion.div>);

}