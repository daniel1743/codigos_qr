/**
 * CONV-03 · the browser entry of the PRODUCT E2E.
 *
 * It mounts what the product mounts: `ApprovedChatLanding`, with its real input,
 * real stages and the real `useCripqerSession`. The only thing this file
 * supplies is the CLIENT at the `advisorTransport` seam — the one seam the
 * brief allows — so what is exercised is the integration, not a copy.
 *
 * (This entry replaces CA-11's `/api/session` + `/api/turn` transport. CONV-03
 * has one canonical client, `createConversionAdvisorClient`, built on the
 * server functions; a browser host that spoke a different protocol would be
 * testing a copy of the integration. The scenarios below therefore script the
 * `AssistantTurnResult` the canonical client would return, and all of them are
 * zero-network.)
 *
 * The module is both a harness (used by `ui-landing-product-e2e.test.tsx`) and
 * a loadable entry: a host page that provides `#cripqer-e2e-root` gets the
 * landing mounted with the scenario named in `?scenario=`.
 */

import { createRoot } from 'react-dom/client';

import { ApprovedChatLanding } from '../../../../features/approved-chat-landing';
import type { ConversionAdvisorClient } from '../../../../features/approved-chat-landing/assistant/advisors/contract';
import type { StartAt } from '../../../../features/approved-chat-landing/types/cripqer';
import type { AssistantTurnResult } from '../../integration/contract';

export const LANDING_E2E_ROOT_ID = 'cripqer-e2e-root';

export const LANDING_SCENARIOS = [
  'answered',
  'slow',
  'degraded',
  'refused',
  'fallback',
  'recover',
  'hostile'
] as const;

export type LandingScenario = (typeof LANDING_SCENARIOS)[number];

const SESSION = '3f0c1e2a-4b5d-4e6f-8a9b-0c1d2e3f4a5b';

export const SAFE_REPLY =
  'CRIPQER reúne tu información y tus enlaces en una sola página con QR. ¿Quieres que te cuente cómo se ve?';

function answered(reply: string, degraded = false): AssistantTurnResult {
  return {
    ok: true,
    data: {
      session_id: SESSION,
      model: 'deepseek-flash',
      reply,
      detected_intents: ['BUSINESS_NEED'],
      relevant_capability_ids: [],
      suggested_action: 'ASK_ONE_QUESTION',
      limitations: [],
      grounding_status: degraded ? 'FALLBACK' : 'GROUNDED',
      degraded,
      turns_used: 1,
      turns_remaining: 49
    }
  };
}

/** One client per scenario, each returning the shape the canonical client parses. */
export function createScenarioClient(scenario: LandingScenario): ConversionAdvisorClient {
  let calls = 0;

  return {
    ask: async () => {
      calls += 1;
      switch (scenario) {
        case 'slow':
          // Never settles: the visitor's turn is genuinely in flight.
          return new Promise<AssistantTurnResult>(() => {});
        case 'degraded':
          return answered(SAFE_REPLY, true);
        case 'refused':
          return { ok: false, code: 'UNAVAILABLE', message: '' };
        case 'fallback':
          return { ok: false, code: 'PROVIDER_MISCONFIGURED', message: '' };
        case 'recover':
          if (calls === 1) throw new Error('network down');
          return answered(SAFE_REPLY);
        case 'hostile':
          // Model text is DATA. React renders it as characters; no markup, no
          // navigation, nothing executed.
          return answered(
            '<img src=x onerror="window.__conv03_xss=1"> <a href="https://evil.invalid/">ir</a>'
          );
        case 'answered':
        default:
          return answered(SAFE_REPLY);
      }
    }
  };
}

export interface LandingMountOptions {
  readonly client: ConversionAdvisorClient;
  readonly startAt?: StartAt;
}

/**
 * Mounts the real landing into `host`. The caller owns React's act() wrapper;
 * this module only owns the seam.
 */
export function mountLanding(host: HTMLElement, options: LandingMountOptions) {
  const root = createRoot(host);
  root.render(
    <ApprovedChatLanding
      startAt={options.startAt ?? 'converse'}
      advisorTransport={options.client}
    />
  );
  return root;
}

/* ------------------------- loadable browser entry ------------------------ */

if (typeof document !== 'undefined') {
  const host = document.getElementById(LANDING_E2E_ROOT_ID);
  if (host !== null) {
    const requested = new URLSearchParams(window.location.search).get('scenario');
    const scenario: LandingScenario =
      requested !== null && (LANDING_SCENARIOS as readonly string[]).includes(requested)
        ? (requested as LandingScenario)
        : 'answered';
    mountLanding(host, { client: createScenarioClient(scenario) });
  }
}
