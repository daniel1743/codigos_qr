import React from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig } from 'framer-motion';
import { AppHeader } from './AppHeader';
import { DiscoverStage } from './discover/DiscoverStage';
import { ConverseStage } from './converse/ConverseStage';
import { GeneratingStage } from './GeneratingStage';
import { MagicEditorStage } from './editor/MagicEditorStage';
import { DraftConflictDialog } from './editor/DraftConflictDialog';
import { AuthOverlay } from './auth/AuthOverlay';
import { TemplatePreview } from './TemplatePreview';
import { TemplateSheet } from './catalog/TemplateSheet';
import { useCripqerSession } from '../hooks/useCripqerSession';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { ConversionAdvisorClient } from '../assistant/advisors/contract';
import type { StartAt } from '../types/cripqer';

interface CripqerExperienceProps {
  startAt: StartAt;
  /** CONV-03 · optional scripted transport; omitted in production. */
  advisorTransport?: ConversionAdvisorClient | undefined;
}

export function CripqerExperience({ startAt, advisorTransport }: CripqerExperienceProps) {
  const session = useCripqerSession(startAt, { advisorTransport });
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { stage, context, previewId, setPreviewId, selectTemplate, drawerOpen, setDrawerOpen } = session;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-canvas font-sans text-ink">
        <LayoutGroup>
          {stage !== 'editor' && <AppHeader stage={stage} context={context} onSignIn={session.openSignIn} />}
          <main className="relative min-h-0 flex-1">
            <AnimatePresence initial={false}>
              {stage === 'discover' && <DiscoverStage key="discover" session={session} />}
              {stage === 'converse' && <ConverseStage key="converse" session={session} isDesktop={isDesktop} />}
              {stage === 'generating' && <GeneratingStage key="generating" context={context} />}
              {stage === 'editor' && session.handoff &&
              <MagicEditorStage key="editor" handoff={session.handoff} onBackToChat={session.backToConversation} />}
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


        <DraftConflictDialog
          open={session.draftConflict !== null}
          busy={session.creating}
          onUseNewDesign={() => void session.useNewDesign()}
          onOpenCurrent={() => void session.openCurrentPage()}
          onClose={session.dismissDraftConflict} />

        <AuthOverlay
          open={session.authPrompt !== null}
          initialMode={session.authPrompt === 'create' ? 'signup' : 'login'}
          onAuthenticated={session.completeAuth}
          onClose={session.closeAuth} />

        {session.handoffError &&
        <div role='alert' className='pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4'>
            <div className='pointer-events-auto flex max-w-[440px] items-center gap-3 rounded-full bg-ink py-2 pl-4 pr-2 text-[13px] text-white shadow-lg'>
              <span className='min-w-0'>{session.handoffError}</span>
              <button type='button' onClick={session.dismissHandoffError} className='flex h-7 shrink-0 items-center rounded-full px-2.5 text-[12.5px] font-medium transition-colors duration-150 hover:bg-white/10'>
                Cerrar
              </button>
            </div>
          </div>}
        
      </div>
    </MotionConfig>);

}