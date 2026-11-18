import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CripqerLogo } from './brand/CripqerLogo';
import { COMPOSER_ID } from './composer/Composer';
import { getBusinessType, getChannel, getTemplate } from '../utils/templates';
import { goals } from '../data/business';
import type { BusinessContext, Stage } from '../types/cripqer';

interface AppHeaderProps {
  stage: Stage;
  context: BusinessContext;
}

export function AppHeader({ stage, context }: AppHeaderProps) {
  const type = getBusinessType(context.businessIdentity.type);
  const channel = getChannel(context.primaryChannel);
  const goal = goals.find((g) => g.id === context.primaryGoal);
  const tplId = context.template.selectedTemplateId;

  const pills = [
  type && { key: 'type', label: context.businessIdentity.name ? `${type.label} ${context.businessIdentity.name}` : type.label },
  goal && { key: 'goal', label: goal.label },
  channel && { key: 'channel', label: channel.label },
  tplId && { key: 'tpl', label: getTemplate(tplId).name, gold: true }].
  filter(Boolean) as {key: string;label: string;gold?: boolean;}[];

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between gap-4 px-5 md:h-16 md:px-10">
      <div className="flex min-w-0 items-center gap-5">
        <CripqerLogo />
        {stage === 'discover' &&
        <span className="hidden truncate text-[13.5px] text-muted lg:block">Crea tu presencia digital con nosotros.</span>
        }
      </div>

      <div className="flex min-w-0 items-center gap-3">
        {stage !== 'discover' && pills.length > 0 &&
        <div className="hidden min-w-0 items-center gap-2 md:flex" aria-live="polite">
            <span className="text-[12px] text-muted">Tu página</span>
            <AnimatePresence initial={false}>
              {pills.map((p) =>
            <motion.span
              key={p.key + p.label}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-2.5 text-[12px] font-medium text-ink shadow-[0_0_0_1px_rgba(15,26,46,0.08)]">
              
                  {p.gold && <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" />}
                  {p.label}
                </motion.span>
            )}
            </AnimatePresence>
          </div>
        }
        <button
          type="button"
          className="h-9 whitespace-nowrap rounded-full px-4 text-[13.5px] font-medium text-ink shadow-[0_0_0_1px_rgba(15,26,46,0.12)] transition-colors duration-150 hover:bg-white">
          
          Iniciar sesión
        </button>
        {stage === 'discover' &&
        <button
          type="button"
          onClick={() => document.getElementById(COMPOSER_ID)?.focus()}
          className="hidden h-9 whitespace-nowrap rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white transition-colors duration-150 hover:bg-ink/90 sm:block">
          
            Crear mi página
          </button>
        }
      </div>
    </header>);

}