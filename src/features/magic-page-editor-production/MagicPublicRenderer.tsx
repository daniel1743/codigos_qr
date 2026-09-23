import { EditorProvider } from "../../isolated/magic-page-editor/contexts/EditorContext";
import { TemplateRenderer } from "../../isolated/magic-page-editor/components/templates/TemplateRenderer";
import type { MagicPageDocumentV1 } from "./magic-document";
import { hydrateMagicEditorState } from "./magic-document";
import "../../isolated/magic-page-editor/styles/magic-editor.css";

export function MagicPublicRenderer({ document }: { document: MagicPageDocumentV1 }) {
  return (
    <div className="magic-editor-root min-h-screen w-full">
      <EditorProvider initialDocument={hydrateMagicEditorState(document)} initialMode="preview">
        <TemplateRenderer />
      </EditorProvider>
    </div>
  );
}
