import { Toaster } from "sonner";
import { EditorProvider } from "./contexts/EditorContext";
import { EditorPage } from "./pages/Editor";
import "./styles/magic-editor.css";
import type { MagicEditorStateV1 } from "../../features/magic-page-editor-production/magic-document";
import type { EditorMode } from "./types/editor";
import type { BioTemplateConfig } from "../../premium-template-studio/types";
import { CanonicalReadOnlyPage } from "./pages/CanonicalReadOnlyPage";
import type { PageDoc, TemplateId } from "./types/editor";
import type { CatalogConversionResult } from "../../features/magic-page-editor-production/catalog-conversion.service";
import type { CatalogAccess } from "../../features/magic-page-editor-production/catalog-link";

export interface MagicEditorAppProps {
  defaultTemplate?: "bio" | "business" | "portfolio";
  defaultDevice?: "desktop" | "mobile";
  initialDocument?: MagicEditorStateV1;
  initialMode?: EditorMode;
  onDocumentChange?: (state: MagicEditorStateV1) => void;
  onPublish?: (state: MagicEditorStateV1) => Promise<void> | void;
  uploadAsset?: (file: File) => Promise<string>;
  catalogConversion?: (
    document: PageDoc,
    templateId: TemplateId,
    blockKey: string,
  ) => Promise<CatalogConversionResult>;
  /** Resolves a linked catalog's page id + products (landing summary + admin). */
  catalogAccess?: CatalogAccess;
  canonicalDocument?: BioTemplateConfig;
  canonicalIsNew?: boolean;
  onCanonicalDocumentChange?: (doc: BioTemplateConfig) => Promise<void> | void;
  onCanonicalPublish?: (doc: BioTemplateConfig) => Promise<void> | void;
}

/** Shared Magic-facing UI boundary for both Magic and canonical page documents. */
export function MagicEditorApp({
  defaultTemplate = "bio",
  defaultDevice = "desktop",
  initialDocument,
  initialMode = "edit",
  onDocumentChange,
  onPublish,
  uploadAsset,
  catalogConversion,
  catalogAccess,
  canonicalDocument,
  canonicalIsNew = false,
  onCanonicalDocumentChange,
  onCanonicalPublish,
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
        catalogConversion={catalogConversion}
        catalogAccess={catalogAccess}
        canonicalDocument={canonicalDocument}
        canonicalIsNew={canonicalIsNew}
        onCanonicalDocumentChange={onCanonicalDocumentChange}
        onCanonicalPublish={onCanonicalPublish}
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
