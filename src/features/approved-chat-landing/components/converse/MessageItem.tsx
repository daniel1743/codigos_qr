import React from 'react';
import { motion } from 'framer-motion';
import { CheckIcon } from 'lucide-react';
import { CripqerMark } from '../brand/CripqerLogo';
import { InlineTemplates } from './InlineTemplates';
import { ReadyCard } from './ReadyCard';
import { ScaledTemplate } from '../templates/ScaledTemplate';
import { getTemplate } from '../../utils/templates';
import type { BusinessContext, ChatMessage, TemplateId } from '../../types/cripqer';

interface MessageItemProps {
  message: ChatMessage;
  isLatest: boolean;
  context: BusinessContext;
  busy: boolean;
  onSend: (text: string) => void;
  onPreview: (id: TemplateId) => void;
  onSelect: (id: TemplateId) => void;
  onCreate: () => void;
  onOpenDrawer: () => void;
}

const ease = [0.23, 1, 0.32, 1] as const;

export function MessageItem({ message, isLatest, context, busy, onSend, onPreview, onSelect, onCreate, onOpenDrawer }: MessageItemProps) {
  const a = message.attachment;

  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease }}
        className="flex flex-col items-end gap-2">
        
        {a?.kind === 'selected' && <SelectedChip id={a.id} onOpen={() => onPreview(a.id)} />}
        <p className="max-w-[85%] rounded-[20px] rounded-br-md bg-[#E9EEF6] px-4 py-2.5 text-[15px] leading-relaxed text-ink md:max-w-[75%]">
          {message.text}
        </p>
      </motion.div>);

  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease }}
      className="flex gap-3">
      
      <CripqerMark size={26} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[15.5px] leading-relaxed text-ink">{message.text}</p>

        {a?.kind === 'templates' &&
        <InlineTemplates ids={a.ids} context={context} onPreview={onPreview} onSelect={onSelect} />
        }

        {a?.kind === 'selected' &&
        <div className="mt-3">
            <SelectedChip id={a.id} onOpen={() => onPreview(a.id)} />
          </div>
        }

        {a?.kind === 'options' &&
        <div className="mt-3 flex flex-wrap gap-2">
            {a.options.map((o) =>
          <button
            key={o.label}
            type="button"
            disabled={!isLatest || busy}
            onClick={() => onSend(o.message)}
            className="h-9 rounded-full bg-white px-4 text-[13.5px] font-medium text-ink shadow-[0_0_0_1px_rgba(15,26,46,0.12)] transition-[background-color,color] duration-150 hover:bg-ink hover:text-white disabled:pointer-events-none disabled:opacity-50">
            
                {o.label}
              </button>
          )}
          </div>
        }

        {a?.kind === 'ready' && <ReadyCard context={context} active={isLatest && !busy} onCreate={onCreate} onChangeStyle={onOpenDrawer} />}
      </div>
    </motion.div>);

}

function SelectedChip({ id, onOpen }: {id: TemplateId;onOpen: () => void;}) {
  const t = getTemplate(id);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-3 rounded-[16px] bg-white p-1.5 pr-4 text-left shadow-[0_0_0_1px_rgba(15,26,46,0.08)] transition-shadow duration-150 hover:shadow-[0_0_0_1px_rgba(15,26,46,0.2)]">
      
      <span className="relative block h-[64px] w-[48px] overflow-hidden rounded-[10px]">
        <ScaledTemplate template={t} />
      </span>
      <span>
        <span className="block text-[13.5px] font-semibold text-ink">{t.name}</span>
        <span className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-gold">
            <CheckIcon className="h-2.5 w-2.5 text-ink" strokeWidth={3} />
          </span>
          Estilo seleccionado
        </span>
      </span>
    </button>);

}