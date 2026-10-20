import { buildLandingContext } from '../../../../lib/conversion-advisor/integration/landing-context';
import { afterSelection } from '../../utils/agent';
import { planCardActions, planTurnActions } from '../landingActionAdapter';
import { assistantFallback } from '../contracts';
import {
  advisorRefusalText,
  CONVERSION_ADVISOR_PROVIDER_ID,
  type ConversionAdvisorClient } from
'./contract';
import type {
  AssistantProvider,
  AssistantRequest,
  AssistantResponse } from
'../contracts';

/*
 * CONV-02 · the Conversion Advisor as an `AssistantProvider`.
 *
 * This is the whole bridge. It is deliberately thin, because every rule it
 * could otherwise absorb already has exactly one owner:
 *
 *   · the MODEL answers (understanding + advice) — one call, inside the advisor;
 *   · the PLANNER acts (`utils/landingPlan.ts`) — deterministic, catalog-bound,
 *     and the only source of `AgentAction[]`;
 *   · the FACADE decides what a failure means (`../service.ts`);
 *   · the TRANSPORT owns the conversation id and the deadline (`./transport.ts`).
 *
 * So this file makes NO second LLM call, holds NO retry policy, reserves NO
 * budget and remembers NOTHING between turns. Its session memory is the
 * advisor's, on the server, and the only thing it forwards is the landing's
 * bounded product snapshot.
 *
 * A CARD CLICK NEVER COSTS A CALL. `template-selection` is a deterministic
 * landing action: it is planned locally and answers immediately.
 */

export interface ConversionAdvisorProviderOptions {
  readonly client: ConversionAdvisorClient;
}

export function createConversionAdvisorProvider(
  options: ConversionAdvisorProviderOptions,
): AssistantProvider {
  const client = options.client;

  return {
    id: CONVERSION_ADVISOR_PROVIDER_ID,

    respond: async function (request: AssistantRequest): Promise<AssistantResponse> {
      // Deterministic path: no session, no provider, no budget.
      if (request.intent.kind === 'template-selection') {
        const id = request.intent.templateId;
        return {
          text: afterSelection(request.context, id).text,
          actions: planCardActions(request.context, id),
          metadata: {
            provider: CONVERSION_ADVISOR_PROVIDER_ID,
            model: null,
            fallback: false
          }
        };
      }

      const message = request.intent.text;
      const landingContext = buildLandingContext(request.context);
      const result = await client.ask({ message, landingContext });

      if (!result.ok) {
        // The closed union's failure is answered as a normal, safe response:
        // the service must not treat a refused conversation as a provider
        // crash, and the text is chosen locally from the code alone.
        return {
          ...assistantFallback(CONVERSION_ADVISOR_PROVIDER_ID),
          text: advisorRefusalText(result.code)
        };
      }

      return {
        text: result.data.reply,
        // The advisor returns PROSE. Every action below is planned
        // deterministically from the message and the landing's own catalog;
        // no id and no action is taken from the model's answer.
        actions: planTurnActions({ context: request.context, message }),
        metadata: {
          provider: CONVERSION_ADVISOR_PROVIDER_ID,
          model: result.data.model,
          // `degraded` means "the provider could not be consulted as intended",
          // which is exactly what the facade's `fallback` flag reports.
          fallback: result.data.degraded
        }
      };
    }
  };
}
