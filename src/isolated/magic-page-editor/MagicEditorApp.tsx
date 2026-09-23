import { Toaster } from "sonner";
import { EditorProvider } from "./contexts/EditorContext";
import { EditorPage } from "./pages/Editor";
import "./styles/magic-editor.css";

export interface MagicEditorAppProps {
  defaultTemplate?: "bio" | "business" | "portfolio";
  defaultDevice?: "desktop" | "mobile";
}

/**
 * Standalone Magic editor boundary.
 * It intentionally owns its local editor state and has no persistence or
 * dependency on any of Cripqer's existing editor systems.
 */
export function MagicEditorApp({
  defaultTemplate = "bio",
  defaultDevice = "desktop",
}: MagicEditorAppProps) {
  return (
    <div className="magic-editor-root h-screen w-full overflow-hidden">
      <EditorProvider initialTemplate={defaultTemplate} initialDevice={defaultDevice}>
        <EditorPage />
        <Toaster
          position="bottom-center"
          toastOptions={{ style: { fontFamily: "Inter, sans-serif" } }}
        />
      </EditorProvider>
    </div>
  );
}
