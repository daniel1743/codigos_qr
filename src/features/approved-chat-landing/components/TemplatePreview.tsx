import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon, ShieldCheckIcon, XIcon } from 'lucide-react';
import { ScaledTemplate } from './templates/ScaledTemplate';
import { TemplatePage } from './templates/TemplatePage';
import { blockLabels, layoutLabels, pageFamilyLabels } from '../data/templates';
import { contentForPack, getTemplate, resolveContent } from '../utils/templates';
import type { BusinessContext, TemplateId } from '../types/cripqer';

interface TemplatePreviewProps {
  id: TemplateId | null;
  context: BusinessContext;
  packId: string | null;
  isDesktop: boolean;
  onClose: () => void;
  onUse: (id: TemplateId) => void;
}

const ease = [0.23, 1, 0.32, 1] as const;

export function TemplatePreview({ id, context, packId, isDesktop, onClose, onUse }: TemplatePreviewProps) {
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, onClose]);

  return (
    <AnimatePresence>
      {id &&
      <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label="Vista previa del estilo">
          <motion.div
          className="absolute inset-0 bg-ink/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose} />
        
          <motion.div
          key={id}
          initial={isDesktop ? { opacity: 0, scale: 0.97 } : { y: '100%' }}
          animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
          exit={isDesktop ? { opacity: 0, scale: 0.97 } : { y: '100%' }}
          transition={{ duration: isDesktop ? 0.22 : 0.3, ease: isDesktop ? ease : [0.32, 0.72, 0, 1] }}
          className="relative flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-canvas shadow-2xl md:h-[88vh] md:max-w-[1060px] md:flex-row md:rounded-[28px]">
          
            <PreviewBody id={id} context={context} packId={packId} isDesktop={isDesktop} onClose={onClose} onUse={onUse} />
          </motion.div>
        </div>
      }
    </AnimatePresence>);

}

interface PreviewBodyProps {
  id: TemplateId;
  context: BusinessContext;
  packId: string | null;
  isDesktop: boolean;
  onClose: () => void;
  onUse: (id: TemplateId) => void;
}

function PreviewBody({ id, context, packId, isDesktop, onClose, onUse }: PreviewBodyProps) {
  const t = getTemplate(id);
  const personalised = Boolean(context.businessIdentity.type || context.businessIdentity.name);
  const content = personalised ? resolveContent(t, context) : contentForPack(t, packId);
  const selected = context.template.selectedTemplateId === id;
  const swatches = [t.palette.bg, t.palette.surface, t.palette.text, t.palette.accent];

  const actions =
  <div className="flex flex-col gap-2">
      <button
      type="button"
      onClick={() => onUse(id)}
      disabled={selected}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-blue text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-brand-blue-deep active:scale-[0.98] disabled:bg-brand-gold-soft disabled:text-ink">
      
        {selected ?
      <>
            <CheckIcon className="h-4 w-4" strokeWidth={2.5} /> Es tu estilo actual
          </> :

      'Usar este estilo'
      }
      </button>
      <button type="button" onClick={onClose} className="h-11 w-full rounded-full text-[14px] font-medium text-muted transition-colors duration-150 hover:text-ink">
        Seguir explorando
      </button>
    </div>;


  return (
    <>
      <div className="relative min-h-0 flex-1 overflow-y-auto bg-subtle">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-subtle/95 px-5 py-3 md:hidden">
          <div>
            <p className="text-[15px] font-semibold text-ink">{t.name}</p>
            <p className="text-[12px] text-muted">{t.personality}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow-sm">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-center px-4 pb-6 md:px-10 md:py-10">
          {isDesktop ?
          <div className="overflow-hidden rounded-[34px] bg-white p-2 shadow-[0_30px_60px_-30px_rgba(15,26,46,0.45)]">
              <div className="overflow-hidden rounded-[27px]">
                <TemplatePage template={t} content={content} />
              </div>
            </div> :

          <div className="w-full max-w-[420px] overflow-hidden rounded-[22px] shadow-[0_20px_40px_-24px_rgba(15,26,46,0.4)]">
              <ScaledTemplate template={t} content={content} autoHeight />
            </div>
          }
        </div>
      </div>

      <aside className="shrink-0 border-t border-line bg-canvas p-4 md:flex md:w-[350px] md:flex-col md:overflow-y-auto md:border-l md:border-t-0 md:p-7">
        <div className="hidden items-start justify-between md:flex">
          <div>
            <p className="text-[12px] font-medium text-muted">Familia visual</p>
            <h2 className="mt-1 font-display text-[24px] font-bold leading-tight text-ink">{t.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            autoFocus
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-subtle hover:text-ink">
            
            <XIcon className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="hidden md:block">
          <p className="mt-3 text-[15px] leading-relaxed text-ink">{t.personality}. Funciona para cualquier negocio: el contenido es tuyo, el estilo se mantiene.</p>
          {personalised &&
          <p className="mt-3 rounded-[12px] bg-brand-blue-soft px-3 py-2 text-[12.5px] leading-relaxed text-brand-blue">Lo estás viendo con los datos de tu negocio.</p>
          }

          <div className="mt-6 flex gap-1.5">
            {swatches.map((c, i) =>
            <span key={i} className="h-7 w-7 rounded-full shadow-[inset_0_0_0_1px_rgba(15,26,46,0.12)]" style={{ background: c }} />
            )}
            <span className="ml-2 self-center text-[12.5px] text-muted">{t.font.label}</span>
          </div>

          <section className="mt-7 rounded-[16px] bg-white p-4 shadow-[0_0_0_1px_rgba(15,26,46,0.07)]" aria-label="Estructura en Magic Editor">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <ShieldCheckIcon className="h-4 w-4 text-brand-blue" />
              100% editable en Magic Editor
            </p>
            <dl className="mt-3 space-y-1.5 text-[12.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Página</dt>
                <dd className="font-medium text-ink">{pageFamilyLabels[t.pageFamily]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Portada</dt>
                <dd className="text-right font-medium text-ink">{t.heroLabel}</dd>
              </div>
            </dl>
            <ol className="mt-3 space-y-1 border-t border-line pt-3 text-[12.5px]">
              {t.sections.map((s, i) =>
              <li key={i} className="flex justify-between gap-3">
                  <span className="text-ink">{blockLabels[s.block]}</span>
                  {s.layout && <span className="text-muted">{layoutLabels[s.layout] ?? s.layout}</span>}
                </li>
              )}
            </ol>
          </section>
          <p className="mt-4 text-[12.5px] leading-relaxed text-muted">Fotos, textos, colores y bloques se cambian después en el editor.</p>
        </div>

        <div className="md:mt-auto md:pt-6">{actions}</div>
      </aside>
    </>);

}