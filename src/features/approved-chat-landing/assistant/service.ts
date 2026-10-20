import { assistantFallback, errorMessage } from './contracts';
import type { AssistantIntent, AssistantOutcome, AssistantProvider, AssistantService } from './contracts';
import type { BusinessContext, ChatMessage, TemplateId } from '../types/cripqer';

/*
 * Assistant Service - provider-independent facade used by the conversational
 * session. It owns the async surface and the error policy; it never knows what
 * a provider is made of.
 *
 * Swapping providers is a construction-time decision (createAssistantService),
 * never a component or hook edit.
 */

export interface CreateAssistantServiceOptions {
  provider: AssistantProvider;
  /** Optional diagnostic sink. It can never change control flow. */
  onProviderError?: (message: string, error: unknown) => void;
}

export function createAssistantService(options: CreateAssistantServiceOptions): AssistantService {
  const provider = options.provider;
  const report = options.onProviderError ?? function () {};

  const request = async (
  intent: AssistantIntent,
  context: BusinessContext,
  history: ChatMessage[])
  : Promise<AssistantOutcome> => {
    try {
      const response = await provider.respond({ intent, context, history });
      return { ok: true, response, error: null };
    } catch (error) {
      report('assistant provider failed: ' + provider.id, error);
      return {
        ok: false,
        response: assistantFallback(provider.id),
        error: errorMessage(error)
      };
    }
  };

  return {
    providerId: provider.id,
    request,
    sendMessage: (text: string, context: BusinessContext, history: ChatMessage[]) =>
    request({ kind: 'message', text }, context, history),
    selectTemplate: (templateId: TemplateId, context: BusinessContext, history: ChatMessage[]) =>
    request({ kind: 'template-selection', templateId }, context, history)
  };
}
