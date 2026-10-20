// @vitest-environment happy-dom
/**
 * CONV-03 · the visitor-facing latency breakdown, measured on the REAL mounted
 * landing with a SCRIPTED Advisor client.
 *
 * The terms are the ones the visitor experiences:
 *
 *   submit → busy            the surface acknowledges the click (render)
 *   think delay               the product's own THINK_MS before a turn starts
 *   provider-equivalent      the delay the scripted client was told to take
 *   CRIPQER-side overhead    the remainder: event handling, projection, state,
 *                            commit — separated from both delays
 *
 * It also checks that a turn logs NOTHING that carries the visitor's text or a
 * credential-shaped string: the assistant stack has no console call, and this
 * run keeps it that way.
 *
 * These are local happy-dom numbers, not production timings; the assertions are
 * wide and the printed line is the measurement. ZERO real calls, zero spend.
 *
 * This file originally measured the CA-11 Advisor entry view. The surface it
 * measures is now the approved landing's own conversation — the one that ships —
 * through the `advisorTransport` seam, with the same intent.
 */
import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import { afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  navigate: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => h.navigate
}));

vi.mock('../../../../lib/supabase/client', () => ({
  getBrowserSupabaseClient: () => ({
    auth: { getSession: async () => ({ data: { session: null }, error: null }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
          order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) })
        })
      }),
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
      insert: async () => ({ data: null, error: null })
    }),
    rpc: async () => ({ data: null, error: null })
  })
}));

import { ApprovedChatLanding } from '../../../../features/approved-chat-landing';
import type { ConversionAdvisorClient } from '../../../../features/approved-chat-landing/assistant/advisors/contract';
import type { AssistantTurnResult } from '../../integration/contract';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.setConfig({ testTimeout: 30_000 });

/** The product's own delay before a turn is dispatched (`THINK_MS`). */
const THINK_MS = 1_100;
const PROVIDER_MS = 80;
const VISITOR_TEXT = 'consulta privada CONV03-ABC';
const ANSWER = 'Respuesta verificada del asesor.';
const SESSION = '3f0c1e2a-4b5d-4e6f-8a9b-0c1d2e3f4a5b';

function answered(reply: string): AssistantTurnResult {
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
      grounding_status: 'GROUNDED',
      degraded: false,
      turns_used: 1,
      turns_remaining: 49
    }
  };
}

let calls = 0;

const client: ConversionAdvisorClient = {
  ask: async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, PROVIDER_MS));
    return answered(ANSWER);
  }
};

const mounted: Array<() => void> = [];

function mount(node: ReactElement): HTMLElement {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(node);
  });
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return host;
}

function field(host: HTMLElement): HTMLTextAreaElement {
  const elements = host.querySelectorAll('#cripqer-composer');
  const element = elements[elements.length - 1];
  if (!(element instanceof HTMLTextAreaElement)) throw new Error('CONV03_TEST: no composer');
  return element;
}

function sendButton(host: HTMLElement): HTMLButtonElement {
  const buttons = host.querySelectorAll('button[aria-label="Enviar"]');
  const button = buttons[buttons.length - 1];
  if (!(button instanceof HTMLButtonElement)) throw new Error('CONV03_TEST: no send button');
  return button;
}

async function until(predicate: () => boolean, budgetMs: number): Promise<number> {
  const startedAt = performance.now();
  while (performance.now() - startedAt < budgetMs && !predicate()) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  }
  return performance.now() - startedAt;
}

afterEach(() => {
  while (mounted.length > 0) mounted.pop()?.();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('CONV-03 — measurement of the real surface', () => {
  it('1 · acknowledges the submit, then settles, with both delays separated', async () => {
    const logged: unknown[][] = [];
    for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logged.push(args);
      });
    }

    const host = mount(<ApprovedChatLanding startAt="converse" advisorTransport={client} />);

    const textarea = field(host);
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter === undefined) throw new Error('CONV03_TEST: no native value setter');
    act(() => {
      setter.call(textarea, VISITOR_TEXT);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const submittedAt = performance.now();
    act(() => {
      sendButton(host).click();
    });
    const acknowledgementMs = performance.now() - submittedAt;

    // The click is acknowledged before the turn is dispatched: the composer is
    // busy as soon as the handler returns, and the client has not been touched
    // yet — the product's own think delay is still ahead.
    expect(sendButton(host).disabled).toBe(true);
    expect(calls).toBe(0);
    // Wall-clock, not a benchmark: under a loaded suite this synchronous
    // render can take a few hundred milliseconds in happy-dom. The contract is
    // that the acknowledgement lands inside the think delay, i.e. before the
    // turn even starts; a regression that blocked the submit for a whole
    // second would still fail here.
    expect(acknowledgementMs).toBeLessThan(THINK_MS);

    const answerVisible = () => (host.textContent ?? '').includes(ANSWER);
    const settleMs = await until(answerVisible, 5_000);
    const totalMs = performance.now() - submittedAt;
    const overheadMs = Math.max(0, totalMs - THINK_MS - PROVIDER_MS);

    expect(answerVisible()).toBe(true);
    expect(calls).toBe(1);
    expect((host.textContent ?? '').split(ANSWER).length - 1).toBe(1);
    expect(totalMs).toBeGreaterThanOrEqual(THINK_MS + PROVIDER_MS);
    // Wide on purpose: happy-dom commit + polling granularity, not a benchmark.
    expect(overheadMs).toBeLessThan(1_500);
    expect(settleMs).toBeLessThan(5_000);

    const summary =
      `[CONV-03 latency] surface: submit→busy=${acknowledgementMs.toFixed(1)}ms ` +
      `think=${THINK_MS}ms provider(scripted)=${PROVIDER_MS}ms total=${totalMs.toFixed(1)}ms ` +
      `cripqer+render≈${overheadMs.toFixed(1)}ms`;

    // Nothing logged a payload: no visitor text, no credential-shaped string.
    const loggedText = logged
      .flat()
      .map((entry) => String(entry))
      .join('\n');
    vi.restoreAllMocks();
    expect(loggedText).not.toContain(VISITOR_TEXT);
    expect(loggedText).not.toMatch(/sk-[A-Za-z0-9]/);
    console.log(summary);
  });
});
