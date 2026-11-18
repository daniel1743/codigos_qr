import { afterSelection, applySelection, runAgent } from '../utils/agent';
import type { AssistantProvider, AssistantRequest, AssistantResponse } from './contracts';

/*
 * PROTOTYPE-ONLY provider: the local rule-based agent that shipped with the
 * approved landing. It is the ONLY module that calls runAgent/afterSelection.
 *
 * It is synchronous on purpose (the prototype answers instantly); the async
 * surface exists so a remote provider can replace it without changing the
 * service, the session or the UI.
 *
 * Do not extend this file with more conversational rules: provider logic will
 * move behind a real LLM provider in a later phase.
 */

export const LOCAL_PROVIDER_ID = 'local-rule-based';

/**
 * Synchronous core. The seed fixtures (utils/seed.ts) use it directly because
 * they build the pre-built prototype states synchronously at mount.
 */
export function respondLocal(request: AssistantRequest): AssistantResponse {
  const base = request.intent.kind === 'template-selection' ?
  afterSelection(
    applySelection(request.context, request.intent.templateId),
    request.intent.templateId) :
  runAgent(request.intent.text, request.context, request.history);
  return {
    ...base,
    metadata: { provider: LOCAL_PROVIDER_ID, model: null, fallback: false }
  };
}

export function createLocalAssistantProvider(): AssistantProvider {
  return {
    id: LOCAL_PROVIDER_ID,
    respond: async function (request) {
      return respondLocal(request);
    }
  };
}
