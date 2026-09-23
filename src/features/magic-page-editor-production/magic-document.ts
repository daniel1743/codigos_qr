import type { PageDoc, TemplateId, TextStyle } from "../../isolated/magic-page-editor/types/editor";
import { templates } from "../../isolated/magic-page-editor/data/templates";

export const MAGIC_DOCUMENT_TYPE = "magic-page" as const;
export const MAGIC_DOCUMENT_VERSION = 1 as const;

export interface MagicPageDocumentV1 {
  documentType: typeof MAGIC_DOCUMENT_TYPE;
  version: typeof MAGIC_DOCUMENT_VERSION;
  template: { id: TemplateId };
  theme: Record<string, unknown>;
  content: Record<string, unknown>;
  texts: Record<string, string>;
  textStyles: Record<string, TextStyle>;
  props: PageDoc["props"];
  blocks: PageDoc["blocks"];
  removed: PageDoc["removed"];
  meta: {
    createdBy: "magic-editor";
    schemaVersion: 1;
  };
}

export interface MagicEditorStateV1 {
  templateId: TemplateId;
  doc: PageDoc;
}

/** The single canonical starter used when a new Magic page is created. */
export function createInitialMagicEditorState(templateId: TemplateId): MagicEditorStateV1 {
  const meta = templates[templateId];
  return {
    templateId,
    doc: {
      blocks: meta.initialBlocks.map((block) => ({ ...block })),
      texts: {},
      textStyles: {},
      props: {},
      removed: {},
    },
  };
}

export function createInitialMagicPageDocument(templateId: TemplateId): MagicPageDocumentV1 {
  return serializeMagicEditorState(createInitialMagicEditorState(templateId));
}

const TEMPLATE_IDS: readonly TemplateId[] = ["bio", "business", "portfolio"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isMagicPageDocument(value: unknown): value is MagicPageDocumentV1 {
  if (!isRecord(value)) return false;
  return (
    value.documentType === MAGIC_DOCUMENT_TYPE &&
    value.version === MAGIC_DOCUMENT_VERSION &&
    isRecord(value.template) &&
    TEMPLATE_IDS.includes(value.template.id as TemplateId) &&
    isRecord(value.texts) &&
    isRecord(value.textStyles) &&
    isRecord(value.props) &&
    Array.isArray(value.blocks) &&
    isRecord(value.removed) &&
    isRecord(value.meta) &&
    value.meta.createdBy === "magic-editor" &&
    value.meta.schemaVersion === 1
  );
}

export function validateMagicPageDocumentV1(value: unknown): MagicPageDocumentV1 {
  if (!isMagicPageDocument(value)) {
    throw new Error("El documento Magic no es válido o no pertenece al schema magic-page V1.");
  }
  return value;
}

export function serializeMagicEditorState(state: MagicEditorStateV1): MagicPageDocumentV1 {
  return {
    documentType: MAGIC_DOCUMENT_TYPE,
    version: MAGIC_DOCUMENT_VERSION,
    template: { id: state.templateId },
    theme: {},
    content: {},
    texts: { ...state.doc.texts },
    textStyles: { ...state.doc.textStyles },
    props: { ...state.doc.props },
    blocks: state.doc.blocks.map((block) => ({ ...block })),
    removed: { ...state.doc.removed },
    meta: { createdBy: "magic-editor", schemaVersion: 1 },
  };
}

export function hydrateMagicEditorState(document: unknown): MagicEditorStateV1 {
  const valid = validateMagicPageDocumentV1(document);
  return {
    templateId: valid.template.id,
    doc: {
      blocks: valid.blocks.map((block) => ({ ...block })),
      texts: { ...valid.texts },
      textStyles: { ...valid.textStyles },
      props: { ...valid.props },
      removed: { ...valid.removed },
    },
  };
}
