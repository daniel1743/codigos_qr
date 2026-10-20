import { afterSelection, applySelection, runAgent } from '../utils/agent';
import type { AssistantProvider, AssistantRequest, AssistantResponse } from './contracts';

/*
 * SUPERSEDED AS A PRODUCT PROVIDER (CONV-02).
 *
 * The landing's brain is the Conversion Advisor, reached through the
 * `conversion-advisor` provider in `assistant/advisors/`. This module still
 * exists because `useCripqerSession` still constructs it at mount
 * (`modify_in_conv02: false`): the provider cutover is CONV-03, and removing the
 * wiring now would half-migrate the hook.
 *
 * It is kept byte-for-byte semantics-compatible on purpose, so a test can prove
 * the service contract did not move. Do not extend it: the rule set is frozen
 * and the seeds now use `utils/seedResponses.ts`.
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
  runAgent(request.intent.text, request.context);
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
