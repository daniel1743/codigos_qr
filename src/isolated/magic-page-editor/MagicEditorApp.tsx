import { Toaster } from "sonner";
import { EditorProvider } from "./contexts/EditorContext";
import { EditorPage } from "./pages/Editor";
import "./styles/magic-editor.css";
import type { MagicEditorStateV1 } from "../../features/magic-page-editor-production/magic-document";
import type { EditorMode } from "./types/editor";

export interface MagicEditorAppProps {
  defaultTemplate?: "bio" | "business" | "portfolio";
  defaultDevice?: "desktop" | "mobile";
  initialDocument?: MagicEditorStateV1;
  initialMode?: EditorMode;
  onDocumentChange?: (state: MagicEditorStateV1) => void;
  onPublish?: (state: MagicEditorStateV1) => Promise<void> | void;
  uploadAsset?: (file: File) => Promise<string>;
}

/**
 * Standalone Magic editor boundary.
 * It intentionally owns its local editor state and has no persistence or
 * dependency on any of Cripqer's existing editor systems.
 */
export function MagicEditorApp({
  defaultTemplate = "bio",
  defaultDevice = "desktop",
  initialDocument,
  initialMode = "edit",
  onDocumentChange,
  onPublish,
  uploadAsset,
}: MagicEditorAppProps) {
  return (
    <div className="magic-editor-root h-screen w-full overflow-hidden">
      <EditorProvider
        initialTemplate={defaultTemplate}
        initialDevice={defaultDevice}
        initialDocument={initialDocument}
        initialMode={initialMode}
        onDocumentChange={onDocumentChange}
        onPublish={onPublish}
        uploadAsset={uploadAsset}
      >
        <EditorPage />
        <Toaster
          position="bottom-center"
          toastOptions={{ style: { fontFamily: "Inter, sans-serif" } }}
        />
      </EditorProvider>
    </div>
  );
}
