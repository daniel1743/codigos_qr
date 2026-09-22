import React from 'react';
import { PenLineIcon } from 'lucide-react';
import { useEditor } from '../contexts/EditorContext';
import { TopBar } from '../components/editor/TopBar';
import { StateTour } from '../components/editor/StateTour';
import { DesktopCanvas } from '../components/editor/DesktopCanvas';
import { MobileCanvas } from '../components/editor/MobileCanvas';
import { BlockPicker } from '../components/editor/BlockPicker';
import { PageSettings } from '../components/editor/PageSettings';

export function EditorPage() {
  const ed = useEditor();
  return (
    <div className="flex h-full w-full flex-col bg-canvas">
      <TopBar />
      <StateTour />
      <main className="relative min-h-0 flex-1">
        {ed.isMobile ? <MobileCanvas /> : <DesktopCanvas />}
        {ed.mode === 'preview' &&
        <button
          type="button"
          onClick={() => ed.setMode('edit')}
          className="absolute right-5 top-4 z-40 inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-[12.5px] font-semibold text-white shadow-toolbar transition-opacity duration-150 hover:opacity-90">
          
            <PenLineIcon className="h-4 w-4" /> Volver a editar
          </button>
        }
      </main>
      <BlockPicker variant="dialog" />
      <PageSettings variant="drawer" />
    </div>);

}