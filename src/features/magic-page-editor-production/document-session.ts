import { readCanonicalPageEnvelope, readDirectPageEnvelope } from "../../lib/canonical-page";
import { createPageStarterConfig } from "../../components/power-editor/pageStarterConfig";
import { validateTemplate } from "../../premium-template-studio/engine/TemplateValidator";
import type { BioTemplateConfig } from "../../premium-template-studio/types";
import type { PageType } from "../../types/database";
import {
  hydrateMagicEditorState,
  isMagicPageDocument,
  type MagicEditorStateV1,
} from "./magic-document";

/** In-memory load result only. The persisted document format is never changed here. */
export type PageEditorSession =
  | { kind: "MAGIC_V1"; document: MagicEditorStateV1; canWrite: true }
  | { kind: "CANONICAL_V1" | "NULL"; config: BioTemplateConfig; canWrite: true }
  | { kind: "DIRECT" | "UNKNOWN"; canWrite: false };

export type DocumentKind = PageEditorSession["kind"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasValidMagicPayload(value: unknown): boolean {
  if (!isMagicPageDocument(value)) return false;
  return (
    value.blocks.every(
      (block) => isRecord(block) && typeof block.key === "string" && typeof block.type === "string",
    ) &&
    Object.values(value.texts).every((text) => typeof text === "string") &&
    Object.values(value.textStyles).every(isRecord) &&
    Object.values(value.props).every(
      (props) =>
        isRecord(props) && Object.values(props).every((entry) => typeof entry === "string"),
    ) &&
    Object.values(value.removed).every((removed) => typeof removed === "boolean")
  );
}

export function detectDocumentKind(value: unknown): DocumentKind {
  if (value === null) return "NULL";
  if (hasValidMagicPayload(value)) return "MAGIC_V1";
  if (readDirectPageEnvelope(value)) return "DIRECT";
  const canonical = readCanonicalPageEnvelope(value);
  if (canonical && validateTemplate(canonical.editorConfig).valid) return "CANONICAL_V1";
  return "UNKNOWN";
}

export function createPageEditorSession(
  value: unknown,
  title: string,
  pageType: PageType,
): PageEditorSession {
  const kind = detectDocumentKind(value);
  if (kind === "MAGIC_V1") {
    return { kind, document: hydrateMagicEditorState(value), canWrite: true };
  }
  if (kind === "CANONICAL_V1") {
    // The detector validated this envelope; no normalization or conversion is performed.
    return { kind, config: readCanonicalPageEnvelope(value)!.editorConfig, canWrite: true };
  }
  if (kind === "NULL") {
    // Use the same canonical starter path as /pages/new, in memory only.
    return { kind, config: createPageStarterConfig(title, pageType), canWrite: true };
  }
  return { kind, canWrite: false };
}
