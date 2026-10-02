import type { MouseEvent } from "react";
import { EditorProvider } from "../../isolated/magic-page-editor/contexts/EditorContext";
import { TemplateRenderer } from "../../isolated/magic-page-editor/components/templates/TemplateRenderer";
import type { MagicPageDocumentV1 } from "./magic-document";
import { hydrateMagicEditorState } from "./magic-document";
import "../../isolated/magic-page-editor/styles/magic-editor.css";

type MagicPublicTrackEvent = {
  type: string;
  blockId?: string;
  url?: string;
  itemId?: string;
  label?: string;
};

interface MagicPublicRendererProps {
  document: MagicPageDocumentV1;
  onTrack?: (event: MagicPublicTrackEvent) => void | Promise<void>;
}

export function MagicPublicRenderer({ document, onTrack }: MagicPublicRendererProps) {
  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!onTrack || !(event.target instanceof Element)) return;

    const anchor = event.target.closest("a[href]");
    if (!anchor) return;

    const url = anchor.getAttribute("href");
    if (!url || url.startsWith("#")) return;

    const label =
      anchor.getAttribute("aria-label")?.trim() ||
      anchor.textContent?.trim() ||
      undefined;

    const track = onTrack({
      type: "link_click",
      url,
      ...(label ? { label } : {}),
    });
    if (anchor.target !== "_blank") {
      event.preventDefault();
      void Promise.resolve(track).catch(() => undefined).finally(() => {
        window.location.assign(url);
      });
    }
  };

  return (
    <div
      className="magic-editor-root min-h-screen w-full"
      onClickCapture={handleClickCapture}
    >
      <EditorProvider
        initialDocument={hydrateMagicEditorState(document)}
        initialMode="preview"
      >
        <TemplateRenderer />
      </EditorProvider>
    </div>
  );
}
