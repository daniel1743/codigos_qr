import React, { useEffect, useRef } from 'react';
import { useEditor } from '../contexts/EditorContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { TopBar } from './TopBar';
import { ProductCard } from './ProductCard';
import { InlineText } from './InlineText';
import { AddProductTile } from './AddProductTile';
import { DesktopToolbar } from './toolbar/DesktopToolbar';
import { MobileSheet } from './MobileSheet';
import { SideInspector } from './SideInspector';
import { DetailModal } from './DetailModal';
import { ChangeImageModal } from './ChangeImageModal';
import { ConfirmDelete } from './ConfirmDelete';
import { PublishWarningModal } from './PublishWarningModal';
import { Toaster } from './Toaster';
import { ProductDetailView } from './ProductDetailView';

export type PrototypeState =
'default' |
'card-selected' |
'title-editing' |
'image-selected' |
'cta-selected' |
'detail-modal' |
'publish-warning';

interface WorkspaceProps {
  initialState: PrototypeState;
  showAdvancedPanel: boolean;
}

export function Workspace({ initialState, showAdvancedPanel }: WorkspaceProps) {
  const editor = useEditor();
  const isMobile = useIsMobile();
  const applied = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    if (showAdvancedPanel) editor.setInspectorOpen(true);
    const first = editor.products[0];
    if (!first) return;
    switch (initialState) {
      case 'card-selected':
        editor.select(first.id, 'card');
        break;
      case 'title-editing':
        editor.select(first.id, 'title');
        break;
      case 'image-selected':
        editor.select(first.id, 'image');
        break;
      case 'cta-selected':
        editor.select(first.id, 'cta');
        break;
      case 'detail-modal':
        editor.openDetail(first.id);
        break;
      case 'publish-warning':
        editor.setPublishWarning(true);
        break;
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the selected target visible when the contextual sheet appears on mobile.
  useEffect(() => {
    if (!isMobile || !editor.selection) return;
    const key = `${editor.selection.cardId}:${editor.selection.kind}`;
    const el = document.querySelector<HTMLElement>(`[data-anchor="${key}"]`);
    if (!el) return;
    const timer = window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const limit = window.innerHeight - 240;
      if (rect.bottom > limit || rect.top < 80) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [isMobile, editor.selection, editor.sheetSnap]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') editor.clearSelection();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-full w-full flex-col" style={{ backgroundColor: editor.pageBackground.color }}>
      <TopBar />

      <div className="flex min-h-0 flex-1 relative">
        {editor.viewingProductId ? (
          <ProductDetailView />
        ) : (
          <>
            <div
              ref={scrollRef}
              data-anchor="page:page"
              onMouseDown={(event) => {
                if (editor.mode === 'preview') return;
                const target = event.target as HTMLElement;
                if (target.closest('[data-anchor]') && !target.closest('[data-anchor="page:page"]')) return;
                if (target.closest('[data-chrome="true"]')) return;
                editor.select('page', 'page');
              }}
              id="workspace-scroll-container"
              className="min-w-0 flex-1 overflow-y-auto px-4 pb-24 pt-8 sm:px-6 lg:px-10 lg:pb-16"
              style={{ paddingBottom: isMobile && editor.selection ? 420 : undefined }}>
              
              <div className="mx-auto w-full max-w-[1240px]">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="max-w-[800px] flex-1">
                    {editor.mode === 'preview' ? (
                      <>
                        <h1 className="font-display text-[30px] leading-[1.12] sm:text-[38px]" style={editor.pageHeader.titleStyle as React.CSSProperties}>
                          {editor.pageHeader.title}
                        </h1>
                        <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed" style={editor.pageHeader.descriptionStyle as React.CSSProperties}>
                          {editor.pageHeader.description}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-full">
                          <InlineText
                            as="h1"
                            value={editor.pageHeader.title}
                            onChange={(val) => editor.patchPageHeader({ title: val })}
                            onActivate={() => editor.select('page', 'page-title')}
                            selected={editor.selection?.kind === 'page-title'}
                            anchor="page:page-title"
                            label="Título de la página"
                            placeholder="Título"
                            style={{ ...(editor.pageHeader.titleStyle as React.CSSProperties), lineHeight: 1.12 }}
                            className="font-display text-[30px] sm:text-[38px]"
                          />
                        </div>
                        <div className="mt-2 max-w-[52ch] w-full text-[14px] leading-relaxed">
                          <InlineText
                            as="p"
                            value={editor.pageHeader.description}
                            onChange={(val) => editor.patchPageHeader({ description: val })}
                            onActivate={() => editor.select('page', 'page-description')}
                            selected={editor.selection?.kind === 'page-description'}
                            anchor="page:page-description"
                            label="Descripción de la página"
                            placeholder="Descripción"
                            style={editor.pageHeader.descriptionStyle as React.CSSProperties}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-[12.5px] text-muted whitespace-nowrap">
                    {editor.products.length} productos · Vista escritorio 1440
                  </p>
                </div>

                <div className="mt-9 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
                  {editor.products.map((product, index) =>
                  <ProductCard key={product.id} product={product} index={index} />
                  )}
                  {editor.mode === 'edit' && <AddProductTile />}
                </div>
              </div>
            </div>

            {editor.mode === 'edit' && <SideInspector />}
          </>
        )}
      </div>

      {!isMobile && editor.mode === 'edit' && !editor.viewingProductId && <DesktopToolbar />}
      {isMobile && editor.mode === 'edit' && !editor.viewingProductId && <MobileSheet />}

      <DetailModal />
      <ChangeImageModal />
      <ConfirmDelete />
      <PublishWarningModal />
      <Toaster />
    </div>);

}