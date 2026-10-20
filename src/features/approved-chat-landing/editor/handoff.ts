import { generateMagicPageDocument } from '../generation/magicPageDocument';
import {
  hydrateMagicEditorState,
  validateMagicPageDocumentV1,
  type MagicEditorStateV1,
  type MagicPageDocumentV1
} from '../../magic-page-editor-production/magic-document';
import { getTemplate, resolveContent } from '../utils/templates';
import type { BusinessContext, TemplateId } from '../types/cripqer';

/**
 * Everything the real-editor hand-off needs: the engine document plus the editor
 * state the engine hydrates from it. Both come from the real engine functions,
 * never from a local re-implementation, so the editor opens exactly the document
 * save/publish will later read.
 */
export interface MagicEditorHandoff {
  document: MagicPageDocumentV1;
  editorState: MagicEditorStateV1;
  templateId: TemplateId;
  pageName: string;
}

/** Raised when the conversation cannot produce a document the editor can open. */
export class MagicEditorHandoffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MagicEditorHandoffError';
  }
}


/**
 * Business Context + the chosen family -> real Magic Editor state.
 *
 * The selected template is mandatory: the conversation always chooses a family
 * before it can create a page, so a missing one means CREATE_PAGE arrived out of
 * order. That surfaces as a controlled error instead of quietly generating a
 * family the user never picked.
 */
export function buildMagicEditorHandoff(
  context: BusinessContext,
  selectedTemplateId: TemplateId | null = context.template.selectedTemplateId
): MagicEditorHandoff {
  if (!selectedTemplateId) {
    throw new MagicEditorHandoffError('Elige un estilo antes de abrir el editor.');
  }
  const pageDocument = generateMagicPageDocument({ businessContext: context, selectedTemplateId });
  const valid = validateMagicPageDocumentV1(pageDocument);
  return {
    document: valid,
    editorState: hydrateMagicEditorState(valid),
    templateId: selectedTemplateId,
    pageName: resolveContent(getTemplate(selectedTemplateId), context).name
  };
}
