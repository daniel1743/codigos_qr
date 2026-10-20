import React from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { MagicEditorApp } from '../../../../isolated/magic-page-editor/MagicEditorApp';
import type { MagicEditorHandoff } from '../../editor/handoff';

interface MagicEditorStageProps {
  handoff: MagicEditorHandoff;
  onBackToChat: () => void;
}

/**
 * Navigation shell around the REAL Magic Editor.
 *
 * The editor below is the production engine (MagicEditorApp, the same component
 * the /pages/$pageId/edit route mounts): nothing is copied or re-created here.
 * Only the way back is ours, because the engine owns no exit affordance and the
 * platform navigation of the production route needs an authenticated, persisted
 * page id (Phase 9).
 */
export function MagicEditorStage({ handoff, onBackToChat }: MagicEditorStageProps) {
  return (
    <div className='absolute inset-0 flex flex-col bg-canvas'>
      <header className='flex h-11 shrink-0 items-center gap-2.5 border-b border-line bg-white px-3 md:px-5'>
        <button
          type='button'
          onClick={onBackToChat}
          aria-label='Volver a la conversación'
          className='inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-muted transition-colors duration-150 hover:bg-subtle hover:text-ink'>
          <ArrowLeftIcon className='h-4 w-4' />
          <span className='hidden sm:inline'>Volver a la conversación</span>
          <span className='sm:hidden'>Volver</span>
        </button>
        <span className='h-5 w-px shrink-0 bg-line' />
        <p className='min-w-0 truncate text-[13.5px] font-semibold text-ink'>{handoff.pageName}</p>
        <span className='ml-auto hidden shrink-0 text-[11.5px] text-muted sm:inline'>Magic Editor</span>
      </header>
      <div className='min-h-0 flex-1'>
        <MagicEditorApp fillParent initialDocument={handoff.editorState} />
      </div>
    </div>
  );
}
