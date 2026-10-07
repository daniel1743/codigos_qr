import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftIcon, LayersIcon, SparklesIcon, XIcon } from 'lucide-react';
import { CripqerMark } from '../brand/CripqerLogo';
import { ScaledTemplate } from '../templates/ScaledTemplate';
import { EditorBlocksPanel } from './EditorBlocksPanel';
import { RegisterDialog } from './RegisterDialog';
import { getBusinessType, getTemplate, resolveContent } from '../../utils/templates';
import type { BusinessContext } from '../../types/cripqer';

interface MagicEditorProps {
  context: BusinessContext;
  onBackToChat: () => void;
}

const ease = [0.23, 1, 0.32, 1] as const;

export function MagicEditor({ context, onBackToChat }: MagicEditorProps) {
  const tpl = getTemplate(context.template.selectedTemplateId ?? 'dark_craft');
  const content = resolveContent(tpl, context);
  const type = getBusinessType(context.businessIdentity.type);
  const pageName = content.name;
  const [hidden, setHidden] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState(true);
  const [register, setRegister] = useState<'save' | 'publish' | null>(null);
  const [blocksOpen, setBlocksOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setToast(false), 6000);
    return () => window.clearTimeout(t);
  }, []);

  const toggle = (k: string) => setHidden((h) => h.includes(k) ? h.filter((x) => x !== k) : [...h, k]);

  const panel = <EditorBlocksPanel template={tpl} hidden={hidden} selected={selected} onToggle={toggle} onSelect={setSelected} />;

  return (
    <motion.div
      className="absolute inset-0 flex flex-col bg-[#F1F0EC]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}>
      
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBackToChat}
            aria-label="Volver a la conversación"
            className="flex h-9 items-center gap-1.5 rounded-full px-2 text-[13px] font-medium text-muted transition-colors duration-150 hover:bg-subtle hover:text-ink">
            
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="hidden lg:inline">Conversación</span>
          </button>
          <span className="hidden h-5 w-px bg-line md:block" />
          <CripqerMark size={24} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-tight text-ink">{pageName}</p>
            <p className="flex items-center gap-1.5 text-[11.5px] text-muted">
              <span className="font-medium text-brand-blue">Magic Editor</span>
              <span
                className="rounded-full bg-subtle px-1.5 py-px text-[10.5px] font-medium text-muted"
                title="Vista simulada. En producción se abre el Magic Editor real con un documento magic-page V1.">
                
                Vista de prototipo
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" />
                Borrador sin guardar
              </span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setRegister('save')}
            className="hidden h-9 rounded-full px-4 text-[13.5px] font-semibold text-ink shadow-[0_0_0_1px_rgba(15,26,46,0.14)] transition-colors duration-150 hover:bg-subtle sm:block">
            
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setRegister('publish')}
            className="h-9 rounded-full bg-brand-blue px-4 text-[13.5px] font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-brand-blue-deep active:scale-[0.97]">
            
            Publicar
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[272px] shrink-0 overflow-y-auto border-r border-line bg-white md:block">{panel}</aside>

        <main className="relative min-w-0 flex-1 overflow-y-auto" onClick={() => setSelected(null)}>
          <AnimatePresence>
            {toast &&
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease, delay: 0.25 }}
              className="sticky top-4 z-20 mx-auto mb-[-52px] flex w-fit max-w-[calc(100%-32px)] items-center gap-3 rounded-full bg-ink py-2 pl-4 pr-2 text-[13px] text-white shadow-lg"
              role="status">
              
                <SparklesIcon className="h-4 w-4 shrink-0 text-brand-gold" />
                <span>
                  Tu página {type ? `de ${type.label.toLowerCase()} ` : ''}está lista. Toca un bloque para editarlo.
                </span>
                <button
                type="button"
                onClick={() => setToast(false)}
                aria-label="Cerrar aviso"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-white/10">
                
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            }
          </AnimatePresence>

          <div className="flex justify-center px-4 pb-24 pt-16 md:pb-16 md:pt-20">
            <motion.div
              layoutId="page-canvas"
              transition={{ duration: 0.3, ease }}
              className="w-full max-w-[406px] rounded-[34px] bg-white p-2 shadow-[0_30px_60px_-30px_rgba(15,26,46,0.45)]"
              onClick={(e) => e.stopPropagation()}>
              
              <div className="overflow-hidden rounded-[27px]">
                <ScaledTemplate
                  template={tpl}
                  content={content}
                  autoHeight
                  hiddenBlocks={hidden}
                  selectedKey={selected}
                  onSelectBlock={setSelected} />
                
              </div>
            </motion.div>
          </div>
        </main>
      </div>

      {/* Mobile blocks access */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center pb-4 md:hidden">
        <button
          type="button"
          onClick={() => setBlocksOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-ink shadow-[0_0_0_1px_rgba(15,26,46,0.1),0_10px_30px_-10px_rgba(15,26,46,0.35)]">
          
          <LayersIcon className="h-4 w-4" />
          Bloques
        </button>
      </div>
      <AnimatePresence>
        {blocksOpen &&
        <div className="fixed inset-0 z-40 md:hidden">
            <motion.div
            className="absolute inset-0 bg-ink/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setBlocksOpen(false)} />
          
            <motion.div
            className="absolute inset-x-0 bottom-0 max-h-[70dvh] overflow-y-auto rounded-t-[26px] bg-white pb-6"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}>
            
              <div className="flex justify-center pt-2.5">
                <span className="h-1.5 w-10 rounded-full bg-ink/15" />
              </div>
              {panel}
            </motion.div>
          </div>
        }
      </AnimatePresence>

      <RegisterDialog open={register !== null} intent={register ?? 'save'} pageName={pageName} onClose={() => setRegister(null)} />
    </motion.div>);

}