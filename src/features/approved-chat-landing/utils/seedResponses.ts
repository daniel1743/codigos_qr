import { afterSelection, applySelection, runAgent } from './agent';
import type { AssistantRequest, AssistantResponse } from '../assistant/contracts';

/*
 * CONV-02 · seed fixtures.
 *
 * The prototype's pre-built conversations are built at mount, before any
 * provider is involved. They keep using the local rule-based agent on purpose:
 * a seed must be DETERMINISTIC and FREE, and it exists to show a reviewer a
 * plausible state, not to demonstrate the advisor.
 *
 * This module is the only bridge `seed.ts` needs, so the local provider is no
 * longer on the seed path and can be retired as a product provider without
 * touching the seeds themselves.
 */

export const SEED_PROVIDER_ID = 'seed-fixture';

export function respondSeed(request: AssistantRequest): AssistantResponse {
  const base =
  request.intent.kind === 'template-selection' ?
  afterSelection(
    applySelection(request.context, request.intent.templateId),
    request.intent.templateId) :
  runAgent(request.intent.text, request.context);
  return {
    ...base,
    metadata: { provider: SEED_PROVIDER_ID, model: null, fallback: false }
  };
}
