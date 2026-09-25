import { EditorProvider } from "../../isolated/magic-page-editor/contexts/EditorContext";
import { TemplateRenderer } from "../../isolated/magic-page-editor/components/templates/TemplateRenderer";
import type { MagicPageDocumentV1 } from "./magic-document";
import { hydrateMagicEditorState } from "./magic-document";
import type { PublicLinkTrackEvent } from "../../isolated/magic-page-editor/utils/publicLinkTracking";
import "../../isolated/magic-page-editor/styles/magic-editor.css";

export interface MagicPublicRendererProps {
  document: MagicPageDocumentV1;
  /**
   * ANALYTICS ADAPTER hook, same contract as `PublicTemplateRenderer.onTrack`
   * and `DirectPageRenderer.onTrack`. Magic templates never track their links
   * themselves: the shared `Editable` anchor layer produces one click intent per
   * click in preview mode and hands it to this host callback, which owns the
   * canonical writer. When absent (editor hosts) nothing is emitted.
   */
  onTrack?: ((event: PublicLinkTrackEvent) => void) | undefined;
}

export function MagicPublicRenderer({ document, onTrack }: MagicPublicRendererProps) {
  return (
    <div className="magic-editor-root min-h-screen w-full">
      <EditorProvider
        initialDocument={hydrateMagicEditorState(document)}
        initialMode="preview"
        onTrack={onTrack}
      >
        <TemplateRenderer />
      </EditorProvider>
    </div>
  );
}
