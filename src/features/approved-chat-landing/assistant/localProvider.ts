import { afterSelection, applySelection, runAgent } from '../utils/agent';
import type { AssistantProvider, AssistantRequest, AssistantResponse } from './contracts';

/*
 * RETIRED AS A PRODUCT PROVIDER (CONV-03).
 *
 * The landing's brain is the Conversion Advisor, reached through the
 * `conversion-advisor` provider in `assistant/advisors/`. This module survives
 * ONLY as the emergency rollback selected by `VITE_LANDING_ASSISTANT_PROVIDER=local`
 * and as the fixture that proves the service contract did not move: no normal
 * visitor turn reaches it.
 *
 * It is kept byte-for-byte semantics-compatible on purpose. Do not extend it:
 * the rule set is frozen and the seeds use `utils/seedResponses.ts`.
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
