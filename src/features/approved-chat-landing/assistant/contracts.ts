import type { AgentResponse, BusinessContext, ChatMessage, TemplateId } from '../types/cripqer';

/*
 * Assistant Service contracts - the stable boundary between the conversational
 * UI and whichever provider answers.
 *
 *   UI / session  ->  AssistantService  ->  AssistantProvider  ->  implementation
 *
 * Today the only implementation is the local rule-based agent (PROTOTYPE). A
 * remote provider (OneProvider / OpenAI / Gemini / ...) must plug in here
 * without touching components, hooks or BusinessContext.
 *
 * The vocabulary is the repo's existing one: AgentResponse (text + actions),
 * AgentAction and ContextPatch. Nothing parallel is introduced. There is
 * deliberately no separate contextPatch field: context changes already travel
 * through the UPDATE_BUSINESS_CONTEXT action, and a second channel would be a
 * second source of truth.
 */

/** Why the assistant was invoked. */
export type AssistantIntent =
{ kind: 'message'; text: string; } |
{ kind: 'template-selection'; templateId: TemplateId; };

export interface AssistantRequest {
  intent: AssistantIntent;
  /** Business Context at the moment of the request (single source of truth). */
  context: BusinessContext;
  /**
   * Conversation history at dispatch time. The local prototype provider ignores
   * it (exactly like the previous direct runAgent call); remote providers are
   * expected to use it.
   */
  history: ChatMessage[];
}

export interface AssistantMetadata {
  provider: string;
  model: string | null;
  /** True when the service had to answer with its safe fallback. */
  fallback: boolean;
}

/**
 * Extends the existing AgentResponse, so it can be handed straight to the
 * BusinessContext adapter (state/businessContext applyResponse) with no
 * translation layer and no duplicated action system.
 */
export interface AssistantResponse extends AgentResponse {
  metadata: AssistantMetadata;
}

export interface AssistantProvider {
  readonly id: string;
  respond(request: AssistantRequest): Promise<AssistantResponse>;
}

export interface AssistantOutcome {
  ok: boolean;
  response: AssistantResponse;
  /** Controlled failure reason; null when ok. */
  error: string | null;
}

export interface AssistantService {
  readonly providerId: string;
  request(intent: AssistantIntent, context: BusinessContext, history: ChatMessage[]): Promise<AssistantOutcome>;
  sendMessage(text: string, context: BusinessContext, history: ChatMessage[]): Promise<AssistantOutcome>;
  selectTemplate(templateId: TemplateId, context: BusinessContext, history: ChatMessage[]): Promise<AssistantOutcome>;
}

/**
 * Safe answer used when a provider fails. It carries NO actions, so applying it
 * can never mutate the Business Context, open the drawer or create a page.
 */
export const ASSISTANT_FALLBACK_TEXT = 'Se me cruzó un cable. ¿Me lo repites?';

export function assistantFallback(providerId: string): AssistantResponse {
  return {
    text: ASSISTANT_FALLBACK_TEXT,
    actions: [],
    metadata: { provider: providerId, model: null, fallback: true }
  };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
