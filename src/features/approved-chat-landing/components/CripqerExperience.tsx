import React from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig } from 'framer-motion';
import { AppHeader } from './AppHeader';
import { DiscoverStage } from './discover/DiscoverStage';
import { ConverseStage } from './converse/ConverseStage';
import { GeneratingStage } from './GeneratingStage';
import { MagicEditor } from './editor/MagicEditor';
import { TemplatePreview } from './TemplatePreview';
import { TemplateSheet } from './catalog/TemplateSheet';
import { useCripqerSession } from '../hooks/useCripqerSession';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { StartAt } from '../types/cripqer';

interface CripqerExperienceProps {
  startAt: StartAt;
}

export function CripqerExperience({ startAt }: CripqerExperienceProps) {
  const session = useCripqerSession(startAt);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { stage, context, previewId, setPreviewId, selectTemplate, drawerOpen, setDrawerOpen, setStage } = session;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-canvas font-sans text-ink">
        <LayoutGroup>
          {stage !== 'editor' && <AppHeader stage={stage} context={context} />}
          <main className="relative min-h-0 flex-1">
            <AnimatePresence initial={false}>
              {stage === 'discover' && <DiscoverStage key="discover" session={session} />}
              {stage === 'converse' && <ConverseStage key="converse" session={session} isDesktop={isDesktop} />}
              {stage === 'generating' && <GeneratingStage key="generating" context={context} />}
              {stage === 'editor' && <MagicEditor key="editor" context={context} onBackToChat={() => setStage('converse')} />}
            </AnimatePresence>
          </main>
        </LayoutGroup>

        {!isDesktop && stage === 'converse' &&
        <TemplateSheet
          open={drawerOpen}
          context={context}
          onPreview={setPreviewId}
          onSelect={selectTemplate}
          onClose={() => setDrawerOpen(false)} />

        }

        <TemplatePreview
          id={previewId}
          context={context}
          packId={session.categoryType}
          isDesktop={isDesktop}
          onClose={() => setPreviewId(null)}
          onUse={selectTemplate} />
        
      </div>
    </MotionConfig>);

}