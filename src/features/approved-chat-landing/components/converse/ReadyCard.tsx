import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRightIcon } from 'lucide-react';
import { ScaledTemplate } from '../templates/ScaledTemplate';
import { getBusinessType, getChannel, getTemplate, resolveContent } from '../../utils/templates';
import { goals } from '../../data/business';
import type { BusinessContext } from '../../types/cripqer';

interface ReadyCardProps {
  context: BusinessContext;
  active: boolean;
  onCreate: () => void;
  onChangeStyle: () => void;
}

export function ReadyCard({ context, active, onCreate, onChangeStyle }: ReadyCardProps) {
  const tplId = context.template.selectedTemplateId;
  if (!tplId) return null;
  const tpl = getTemplate(tplId);
  const type = getBusinessType(context.businessIdentity.type);
  const channel = getChannel(context.primaryChannel);
  const goal = goals.find((g) => g.id === context.primaryGoal);

  const rows = [
  { label: 'Negocio', value: [type?.label, context.businessIdentity.name].filter(Boolean).join(' · ') || '—' },
  { label: 'Objetivo', value: goal?.label ?? '—' },
  { label: 'Contacto', value: channel?.label ?? '—' },
  { label: 'Estilo', value: tpl.name }];


  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="mt-4 flex max-w-[540px] overflow-hidden rounded-[22px] bg-white shadow-[0_0_0_1px_rgba(15,26,46,0.08),0_16px_40px_-24px_rgba(15,26,46,0.3)]">
      
      <div className="relative w-[112px] shrink-0 md:w-[148px]">
        <ScaledTemplate template={tpl} content={resolveContent(tpl, context)} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4 md:p-5">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13.5px]">
          {rows.map((r) =>
          <React.Fragment key={r.label}>
              <dt className="text-muted">{r.label}</dt>
              <dd className="truncate font-medium text-ink">{r.value}</dd>
            </React.Fragment>
          )}
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCreate}
            disabled={!active}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-blue px-4 text-[13.5px] font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-brand-blue-deep active:scale-[0.97] disabled:opacity-50">
            
            Crear mi página
            <ArrowRightIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onChangeStyle}
            className="inline-flex h-10 items-center rounded-full px-3 text-[13.5px] font-medium text-muted transition-colors duration-150 hover:text-ink">
            
            Cambiar estilo
          </button>
        </div>
        <p className="mt-3 text-[12px] text-muted">Sin registro. Podrás editar todo después.</p>
      </div>
    </motion.div>);

}