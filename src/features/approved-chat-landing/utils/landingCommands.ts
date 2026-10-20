import { nextStep } from './agent';
import { isCreateIntent, isPageReady } from './landingPlan';
import type { AgentResponse, BusinessContext } from '../types/cripqer';

/*
 * CONV-03 · the landing's deterministic commands.
 *
 * CREATE_PAGE is a PRODUCT command, not a conversational one. A visitor who says
 * "créamela" has given an instruction, and the only thing standing between that
 * sentence and a page is whether the landing already knows the four facts the
 * builder needs. Neither the Advisor nor DeepSeek gets a vote:
 *
 *   · READY          -> the existing `nextStep(ctx, true)` produces the same
 *                       CREATE_PAGE the prototype always produced, and the
 *                       session's existing persistence path runs it.
 *   · NOT READY      -> `nextStep(ctx, false)` asks for the next missing slot
 *                       with its own chips. No page is created and no provider
 *                       is called.
 *   · NOT A COMMAND  -> `null`; the turn belongs to the Advisor.
 *
 * The model can never reach this function with an action: the provider's action
 * adapter does not accept CREATE_PAGE, and this planner never reads model output.
 * It reads the visitor's sentence and the landing's own Business Context.
 *
 * Zero provider calls, zero budget, zero retries: this is why creation costs
 * nothing and cannot be talked into happening early.
 */

export interface DeterministicTurn {
  /** The exact response the existing reducer consumes, as the prototype built it. */
  readonly response: AgentResponse;
  /** True only for the ready branch: the reducer will fire the real creation. */
  readonly creates: boolean;
}

export function planDeterministicTurn(input: {
  readonly context: BusinessContext;
  readonly message: string;
}): DeterministicTurn | null {
  if (!isCreateIntent(input.message)) return null;

  if (isPageReady(input.context)) {
    return { response: nextStep(input.context, true), creates: true };
  }

  // The deterministic "what is still missing" answer. It can only ask, show
  // chips or show the ready card; it never creates.
  return { response: nextStep(input.context, false), creates: false };
}
