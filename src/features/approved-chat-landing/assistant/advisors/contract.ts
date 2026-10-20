import type {
  AssistantTurnResult } from
'../../../../lib/conversion-advisor/integration/contract';
import type { LandingContextSnapshot } from '../../../../lib/conversion-advisor/integration/landing-context';
import { ASSISTANT_FALLBACK_TEXT } from '../contracts';

/*
 * CONV-02 · the Conversion Advisor provider's own contract.
 *
 * The facade (`AssistantProvider`) knows nothing about the advisor; this file
 * is where that knowledge stops. It defines the CLIENT the provider needs — an
 * object that knows how to answer one turn and owns the conversation id — and
 * the product sentences a refusal becomes.
 *
 * TWO PROPERTIES ARE LOAD-BEARING:
 *
 *  1. The client does NOT expose the session id. The landing never sees it, the
 *     provider never forwards it and the UI cannot render it, so the advisor's
 *     conversation handle cannot become a product identifier.
 *  2. A refusal is mapped to FIXED text here, from the code alone. The server's
 *     message is not rendered: it is a diagnostic, and a page that displays
 *     whatever a failure carried is one string away from displaying a body.
 */

export const CONVERSION_ADVISOR_PROVIDER_ID = 'conversion-advisor';

/**
 * The browser's deadline for ONE turn, session start included.
 *
 * Worst case on the server is two operations × two attempts × 12 s plus
 * backoff ≈ 48.8 s (`ADVISOR_TIMEOUT_MS` = 12000, `ADVISOR_MAX_RETRIES` = 1).
 * 60 s leaves ~11 s of margin. This value is PREPARED here and wired in CONV-03;
 * nothing in CONV-02 mounts a browser turn.
 */
export const ADVISOR_BROWSER_DEADLINE_MS = 60_000;

export interface ConversionAdvisorAsk {
  readonly message: string;
  /** Already built and bounded by the landing; the client only forwards it. */
  readonly landingContext: LandingContextSnapshot;
}

/**
 * What the provider depends on. The transport implements it; a test injects a
 * recorder. It owns the conversation identity and the deadline, and nothing
 * else: no budget, no retries, no memory.
 */
export interface ConversionAdvisorClient {
  ask(input: ConversionAdvisorAsk): Promise<AssistantTurnResult>;
}

/**
 * A refusal is a CONVERSATION STATE, not a crash. These are the only strings a
 * failed turn can produce, chosen by code.
 */
export function advisorRefusalText(code: string): string {
  switch (code) {
    case 'INVALID_INPUT':
      return 'No pude leer ese mensaje. ¿Me lo escribes de otra forma?';
    case 'SESSION_UNKNOWN':
      return 'Se me perdió el hilo de la conversación. ¿Me lo repites?';
    case 'TURN_LIMIT_REACHED':
      return 'Llegamos al límite de esta conversación. Si quieres, podemos empezar una nueva.';
    case 'PROVIDER_MISCONFIGURED':
    case 'UNAVAILABLE':
    default:
      return ASSISTANT_FALLBACK_TEXT;
  }
}
