import React, { type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon, EyeIcon } from 'lucide-react';
import { ScaledTemplate } from './ScaledTemplate';
import type { PageContent, TemplateFamily } from '../../types/cripqer';

interface TemplateCardProps {
  template: TemplateFamily;
  onOpen: () => void;
  selected?: boolean;
  index?: number | undefined;
  content?: PageContent;
  frameClassName?: string;
  frameStyle?: CSSProperties;
  className?: string;
  footer?: ReactNode;
  compactLabel?: boolean;
  hideLabel?: boolean;
}

export function TemplateCard({
  template,
  onOpen,
  selected,
  index,
  content,
  frameClassName = '',
  frameStyle,
  className = '',
  footer,
  compactLabel,
  hideLabel
}: TemplateCardProps) {
  const fadeKey = `${template.id}-${content?.name ?? ''}`;
  return (
    <div className={`group flex min-h-0 flex-col ${className}`}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver estilo ${template.name}`}
        style={frameStyle}
        className={`relative min-h-0 overflow-hidden rounded-[20px] bg-white text-left outline-none ring-offset-2 ring-offset-canvas transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-brand-blue ${
        selected ?
        'shadow-[0_0_0_2px_#D4AF37,0_14px_34px_-18px_rgba(15,26,46,0.35)]' :
        'shadow-[0_0_0_1px_rgba(15,26,46,0.07),0_24px_48px_-28px_rgba(15,26,46,0.45)] hover:shadow-[0_0_0_1px_rgba(15,26,46,0.1),0_30px_56px_-26px_rgba(15,26,46,0.5)]'} ${
        frameClassName}`}>
        
        <AnimatePresence initial={false}>
          <motion.div
            key={fadeKey}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}>
            
            <ScaledTemplate template={template} content={content} />
          </motion.div>
        </AnimatePresence>

        <span className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink/90 px-3.5 text-[12px] font-medium text-white">
            <EyeIcon className="h-3.5 w-3.5" />
            {hideLabel ? template.name : 'Ver estilo'}
          </span>
        </span>

        {index !== undefined &&
        <span className="absolute left-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-ink shadow-sm">
            {index + 1}
          </span>
        }

        {selected &&
        <span className="absolute right-2.5 top-2.5 inline-flex h-6 items-center gap-1 rounded-full bg-white pl-1 pr-2 text-[11px] font-semibold text-ink shadow-sm">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-gold">
              <CheckIcon className="h-3 w-3 text-ink" strokeWidth={3} />
            </span>
            Elegida
          </span>
        }
      </button>

      {!hideLabel &&
      <div className={`${compactLabel ? 'mt-2' : 'mt-3'} min-w-0`}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[13px] font-semibold text-ink">{template.name}</span>
            <span className="shrink-0 truncate text-[12px] text-muted">{template.personality.split(',')[0]}</span>
          </div>
          {footer}
        </div>
      }
    </div>);

}