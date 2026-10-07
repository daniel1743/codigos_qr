import React from "react";
import { motion } from "framer-motion";
import { FileTextIcon, ImageIcon, LightbulbIcon, SparklesIcon, type LucideIcon } from "lucide-react";
import { Composer } from "../composer/Composer";
import { TemplateShowcase } from "./TemplateShowcase";
import { quickActions } from "../../data/business";
import { CripqerSession } from "../../hooks/useCripqerSession";
interface DiscoverStageProps {
  session: CripqerSession;
}
const ease = [0.23, 1, 0.32, 1] as const;
const QUICK_ICONS: LucideIcon[] = [LightbulbIcon, SparklesIcon, ImageIcon, FileTextIcon];

/*
 * Business-type options are no longer a permanent row here. The assistant offers them
 * contextually (SHOW_OPTIONS) only when the business type is still unknown.
 */
export function DiscoverStage({
  session
}: DiscoverStageProps) {
  const {
    draft,
    setDraft,
    send,
    thinking,
    slots,
    setPreviewId,
    setRotationPaused,
    previewId
  } = session;
  return <motion.div className="absolute inset-0 flex flex-col" exit={{
    opacity: 1,
    transition: {
      duration: 0.3
    }
  }}>
      {/* Inspiration — the showcase owns all remaining height */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col px-5 md:px-10">
          <motion.div className="shrink-0 pt-1 text-center md:pt-[0.5vh]" exit={{
          opacity: 0,
          y: -12,
          transition: {
            duration: 0.2,
            ease
          }
        }}>
            <h1 className="font-display text-[27px] font-bold leading-[1.1] tracking-[-0.025em] text-ink md:text-[40px] xl:text-[44px] xl:leading-[1.06]">
              Páginas increíbles,
              <br className="md:hidden" /> sin empezar desde cero.
            </h1>
            <p className="mt-1.5 text-[14.5px] text-muted md:mt-2 md:text-[16px]">Explora estilos o cuéntanos qué quieres crear.</p>
          </motion.div>

          <div className="mt-5 h-[48vh] min-h-[320px] md:mt-[3vh] md:h-auto md:min-h-[280px] md:flex-1">
            <TemplateShowcase slots={slots} packId={null} onOpen={setPreviewId} setPaused={setRotationPaused} previewOpen={previewId !== null} />
          </div>
        </div>
      </div>

      {/* Creation — lower third, with clear air above the composer */}
      <div className="shrink-0 px-4 pb-4 pt-5 md:px-10 md:pb-[3vh] md:pt-[4.5vh]">
        <div className="mx-auto w-full max-w-[860px]">
          <motion.div layoutId="composer" transition={{
          duration: 0.3,
          ease
        }}>
            <Composer size="lg" value={draft} onChange={setDraft} onSubmit={send} processing={thinking} />
          </motion.div>
          <motion.div className="no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 md:mx-0 md:mt-3 md:justify-center md:px-0" exit={{
          opacity: 0,
          transition: {
            duration: 0.15
          }
        }}>
            {quickActions.map((q, i) => {
            const Icon = QUICK_ICONS[i]!;
            return <button key={q.label} type="button" onClick={() => send(q.message)} className="inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium text-ink/70 transition-[background-color,color] duration-150 hover:bg-white/80 hover:text-ink md:h-9">
                  <Icon className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
                  {q.label}
                </button>;
          })}
          </motion.div>
        </div>
      </div>
    </motion.div>;
}