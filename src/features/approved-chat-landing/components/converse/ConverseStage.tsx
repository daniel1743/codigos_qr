import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGridIcon, LightbulbIcon } from 'lucide-react';
import { Composer } from '../composer/Composer';
import { CripqerMark } from '../brand/CripqerLogo';
import { MessageItem } from './MessageItem';
import { TemplateCatalog } from '../catalog/TemplateCatalog';
import { conversationIdeas } from '../../data/business';
import type { CripqerSession } from '../../hooks/useCripqerSession';

interface ConverseStageProps {
  session: CripqerSession;
  isDesktop: boolean;
}

const ease = [0.23, 1, 0.32, 1] as const;

export function ConverseStage({ session, isDesktop }: ConverseStageProps) {
  const { messages, thinking, context, draft, setDraft, send, selectTemplate, setPreviewId, requestCreate, drawerOpen, setDrawerOpen } = session;
  const thread = useRef<HTMLDivElement>(null);
  const [ideasOpen, setIdeasOpen] = useState(false);

  useEffect(() => {
    const el = thread.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, thinking]);

  const footer =
  <div className="relative flex items-center gap-1">
      <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setDrawerOpen(!drawerOpen);
      }}
      aria-pressed={drawerOpen}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors duration-150 ${
      drawerOpen ? 'bg-brand-blue-soft text-brand-blue' : 'text-ink/80 hover:bg-subtle hover:text-ink'}`
      }>
      
        <LayoutGridIcon className="h-4 w-4" />
        Plantillas
      </button>
      <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIdeasOpen((v) => !v);
      }}
      aria-expanded={ideasOpen}
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink/80 transition-colors duration-150 hover:bg-subtle hover:text-ink">
      
        <LightbulbIcon className="h-4 w-4" />
        Ideas
      </button>
      <AnimatePresence>
        {ideasOpen &&
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={{ duration: 0.16, ease }}
        style={{ transformOrigin: 'bottom left' }}
        className="absolute bottom-12 left-0 z-30 w-[290px] rounded-[18px] bg-white p-1.5 shadow-[0_0_0_1px_rgba(15,26,46,0.08),0_20px_40px_-16px_rgba(15,26,46,0.3)]"
        onClick={(e) => e.stopPropagation()}>
        
            <p className="px-3 pb-1 pt-2 text-[11.5px] font-medium text-muted">Prueba a decir</p>
            {conversationIdeas.map((idea) =>
        <button
          key={idea}
          type="button"
          onClick={() => {
            setIdeasOpen(false);
            send(idea);
          }}
          className="block w-full rounded-[12px] px-3 py-2 text-left text-[13.5px] text-ink transition-colors duration-150 hover:bg-subtle">
          
                {idea}
              </button>
        )}
          </motion.div>
      }
      </AnimatePresence>
    </div>;


  return (
    <motion.div
      className="absolute inset-0 flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.25, delay: 0.08 }}>
      
      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={thread} className="flex-1 overflow-y-auto" onClick={() => setIdeasOpen(false)}>
          <div className="mx-auto flex max-w-[780px] flex-col gap-7 px-4 pb-8 pt-4 md:px-6 md:pt-8">
            {messages.map((m, i) =>
            <MessageItem
              key={m.id}
              message={m}
              isLatest={i === messages.length - 1}
              context={context}
              busy={thinking}
              onSend={send}
              onPreview={setPreviewId}
              onSelect={selectTemplate}
              onCreate={requestCreate}
              onOpenDrawer={() => setDrawerOpen(true)} />

            )}
            <AnimatePresence>
              {thinking &&
              <motion.div
                key="thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-3"
                aria-live="polite">
                
                  <CripqerMark size={26} />
                  <span className="flex gap-1" aria-label="Cripqer está pensando">
                    {[0, 1, 2].map((i) =>
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-ink/40"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />

                  )}
                  </span>
                </motion.div>
              }
            </AnimatePresence>
          </div>
        </div>

        <div className="px-3 pb-3 pt-1 md:px-6 md:pb-6">
          <div className="mx-auto max-w-[780px]">
            <motion.div layoutId="composer" transition={{ duration: 0.3, ease }}>
              <Composer size="md" value={draft} onChange={setDraft} onSubmit={send} processing={thinking} footer={footer} autoFocus={isDesktop} />
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isDesktop && drawerOpen &&
        <motion.aside
          key="drawer"
          aria-label="Plantillas"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 460, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease }}
          className="shrink-0 overflow-hidden border-l border-line bg-canvas">
          
            <div className="h-full w-[460px]">
              <TemplateCatalog
              context={context}
              onPreview={setPreviewId}
              onSelect={selectTemplate}
              onClose={() => setDrawerOpen(false)} />
            
            </div>
          </motion.aside>
        }
      </AnimatePresence>
    </motion.div>);

}