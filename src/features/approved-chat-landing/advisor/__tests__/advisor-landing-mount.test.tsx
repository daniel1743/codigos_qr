// @vitest-environment happy-dom
/**
 * CONV-03 · the REAL landing, mounted, talking to the Conversion Advisor.
 *
 * These tests drive the landing the product actually ships: the same wrapper,
 * the same hook, the same composer and the same conversational stage. The only
 * thing replaced is the CLIENT at the far edge — the `advisorTransport` seam —
 * so what is checked is the integration itself, not a copy of it.
 *
 * (This file originally asserted the CA-11 Advisor entry view, which CONV-03
 * deliberately does not mount: the approved landing has one assistant surface,
 * not two. The assertions were ported to the seam that ships, keeping the same
 * intent — one call per turn, one visible answer, no prototype voice, no
 * out-of-contract text in the DOM.)
 *
 * The idiom is the repository's own (`createRoot` + `act`, no Testing Library).
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

import { ApprovedChatLanding } from '../../index';
import type { ConversionAdvisorClient } from '../../assistant/advisors/contract';
import type { AssistantTurnResult } from '../../../../lib/conversion-advisor/integration/contract';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.setConfig({ testTimeout: 30_000 });

/* ============================== fixtures ================================ */

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

/** A client the test releases by hand, so a turn can be observed in flight. */
function heldClient(): {
  readonly client: ConversionAdvisorClient;
  readonly calls: string[];
  release: (value: AssistantTurnResult) => void;
} {
  const calls: string[] = [];
  let resolve: ((value: AssistantTurnResult) => void) | null = null;
  return {
    calls,
    client: {
      ask: ({ message }) => {
        calls.push(message);
        return new Promise<AssistantTurnResult>((res) => {
          resolve = res;
        });
      }
    },
    release: (value) => resolve?.(value)
  };
}

/* =============================== the DOM ================================ */

const mounted: Array<() => void> = [];

function mount(node: ReactElement): HTMLElement {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(node);
  });
  mounted.push(() => {
    act(() => {
      root.unmount();
    });
    host.remove();
  });
  return host;
}

/** The product's own think delay, waited out (real timers, no shortcuts). */
async function waitForTurn(ms = 1_350): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
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

function type(host: HTMLElement, value: string): void {
  const element = field(host);
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  if (setter === undefined) throw new Error('CONV03_TEST: no native value setter');
  act(() => {
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function sendTurn(host: HTMLElement, text: string): Promise<void> {
  type(host, text);
  act(() => {
    sendButton(host).click();
  });
  await waitForTurn();
}

/** How many times a sentence appears in the rendered transcript. */
function occurrences(host: HTMLElement, text: string): number {
  return (host.textContent ?? '').split(text).length - 1;
}

afterEach(() => {
  while (mounted.length > 0) mounted.pop()?.();
  document.body.innerHTML = '';
});

/* ============================= the landing ============================== */

describe('CONV-03 · the real landing mounts the Advisor', () => {
  it('shows the approved conversation and performs no call when nothing is typed', () => {
    const held = heldClient();
    const host = mount(
      <ApprovedChatLanding startAt="converse" advisorTransport={held.client} />
    );

    expect(field(host)).toBeTruthy();
    // The approved seed conversation is still there.
    expect(host.textContent).toContain('Tengo una pastelería');
    expect(held.calls).toEqual([]);
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it('sends the typed text and renders the Advisor answer exactly once', async () => {
    const held = heldClient();
    const host = mount(
      <ApprovedChatLanding startAt="converse" advisorTransport={held.client} />
    );

    type(host, 'hola');
    act(() => {
      sendButton(host).click();
    });
    // The product's own think delay, then the turn is genuinely in flight.
    await waitForTurn(1_200);

    // The client was consulted once, and the composer is busy (the product's own
    // single-flight signal).
    expect(held.calls).toEqual(['hola']);
    expect(sendButton(host).disabled).toBe(true);

    held.release(answered('Tu página puede reunir tus enlaces y tu QR en un solo lugar.'));
    await settle();

    expect(occurrences(host, 'Tu página puede reunir tus enlaces y tu QR en un solo lugar.')).toBe(1);
    // One assistant voice per turn: the prototype's own greeting must not appear.
    expect(host.textContent).not.toContain('¿Qué quieres crear hoy?');
    expect(host.textContent).not.toContain('¿Para qué tipo de negocio');
  });

  it('continues ONE conversation across three typed turns', async () => {
    const calls: string[] = [];
    const client: ConversionAdvisorClient = {
      ask: async ({ message }) => {
        calls.push(message);
        return answered(`Respuesta número ${calls.length}.`);
      }
    };
    const host = mount(<ApprovedChatLanding startAt="converse" advisorTransport={client} />);

    await sendTurn(host, 'uno');
    await sendTurn(host, 'dos');
    await sendTurn(host, 'tres');

    expect(calls).toEqual(['uno', 'dos', 'tres']);
    expect(occurrences(host, 'Respuesta número 1.')).toBe(1);
    expect(occurrences(host, 'Respuesta número 2.')).toBe(1);
    expect(occurrences(host, 'Respuesta número 3.')).toBe(1);
  });
});

/* ========================= concurrency and failure ====================== */

describe('CONV-03 · the landing cannot answer twice', () => {
  it('a second submit while a turn is open produces no second turn', async () => {
    const held = heldClient();
    const host = mount(
      <ApprovedChatLanding startAt="converse" advisorTransport={held.client} />
    );

    type(host, 'hola');
    act(() => {
      sendButton(host).click();
    });
    // A real second click arrives as a SEPARATE discrete event, after React has
    // committed the busy state. That commit is the product's single-flight
    // guard: the button is disabled and the second click is a no-op.
    await settle();
    expect(sendButton(host).disabled).toBe(true);
    act(() => {
      sendButton(host).click();
    });
    await waitForTurn(1_200);

    expect(held.calls).toEqual(['hola']);
    held.release(answered('Una sola respuesta.'));
    await settle();
    expect(occurrences(host, 'Una sola respuesta.')).toBe(1);
  });

  it('keeps a failed turn visible and lets the visitor keep talking', async () => {
    let call = 0;
    const client: ConversionAdvisorClient = {
      ask: async () => {
        call += 1;
        if (call === 1) throw new Error('network down');
        return answered('Aquí sigo.');
      }
    };
    const host = mount(<ApprovedChatLanding startAt="converse" advisorTransport={client} />);

    await sendTurn(host, 'hola');

    expect(call).toBe(1);
    // The facade's safe sentence, not the prototype's answer.
    expect(occurrences(host, 'Se me cruzó un cable. ¿Me lo repites?')).toBe(1);
    expect(host.textContent).not.toContain('¿Qué quieres crear hoy?');
    // The conversation recovers without a reload.
    expect(sendButton(host).disabled).toBe(true);
    type(host, 'otra pregunta');
    expect(sendButton(host).disabled).toBe(false);

    await sendTurn(host, 'otra pregunta');
    expect(call).toBe(2);
    expect(occurrences(host, 'Aquí sigo.')).toBe(1);
  });

  it('renders a refusal as fixed product text and never its diagnostic message', async () => {
    const client: ConversionAdvisorClient = {
      ask: async () => ({
        ok: false,
        code: 'UNAVAILABLE',
        message: 'TEXTO QUE NO DEBE RENDERIZARSE Authorization Bearer sk-leak'
      })
    };
    const host = mount(<ApprovedChatLanding startAt="converse" advisorTransport={client} />);

    await sendTurn(host, 'hola');

    expect(host.textContent).not.toContain('TEXTO QUE NO DEBE RENDERIZARSE');
    expect(host.textContent).not.toContain('sk-leak');
    expect(host.innerHTML).not.toContain('Authorization');
    expect(occurrences(host, 'Se me cruzó un cable. ¿Me lo repites?')).toBe(1);
  });
});
