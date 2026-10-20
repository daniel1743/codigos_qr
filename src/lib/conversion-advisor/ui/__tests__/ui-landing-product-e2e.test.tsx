// @vitest-environment happy-dom
/**
 * CONV-03 · PRODUCT E2E — the real landing, mounted, end to end.
 *
 * WHAT IS REAL: the approved landing (`ApprovedChatLanding` →
 * `useCripqerSession` → the composer → the conversational stage), the
 * AssistantService facade, the Conversion Advisor provider, the deterministic
 * landing-action adapter and the product reducer.
 *
 * WHAT IS NOT: the client at the `advisorTransport` seam only. Each scenario
 * scripts the `AssistantTurnResult` the canonical client would return, so no
 * network is used and no provider is paid.
 *
 * (This file replaces CA-11's chromium suite, which drove the Advisor entry
 * view through a Vite pipeline host. CONV-03 does not mount a second assistant
 * surface and must not spend money in its suite, so the same product
 * expectations — one voice, recovery, hostile text as text, no self-navigation —
 * are asserted against the surface that ships.)
 */
import { act } from 'react';
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

import {
  createScenarioClient,
  mountLanding,
  SAFE_REPLY,
  type LandingScenario
} from '../e2e/landing-entry';
import { ASSISTANT_FALLBACK_TEXT } from '../../../../features/approved-chat-landing/assistant/contracts';
import type { ConversionAdvisorClient } from '../../../../features/approved-chat-landing/assistant/advisors/contract';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.setConfig({ testTimeout: 30_000 });

const THINK_WAIT_MS = 1_350;

/* ============================== the harness ============================= */

const mounted: Array<() => void> = [];

function open(scenario: LandingScenario): {
  host: HTMLElement;
  client: ConversionAdvisorClient & { ask: ReturnType<typeof vi.fn> };
} {
  const client = createScenarioClient(scenario);
  const ask = vi.spyOn(client, 'ask');
  const host = document.createElement('div');
  document.body.append(host);
  let root: ReturnType<typeof createRoot>;
  act(() => {
    root = mountLanding(host, { client, startAt: 'converse' });
  });
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return { host, client: Object.assign(client, { ask }) };
}

function field(host: HTMLElement): HTMLTextAreaElement {
  const elements = host.querySelectorAll('#cripqer-composer');
  const element = elements[elements.length - 1];
  if (!(element instanceof HTMLTextAreaElement)) throw new Error('CONV03_E2E: no composer');
  return element;
}

function sendButton(host: HTMLElement): HTMLButtonElement {
  const buttons = host.querySelectorAll('button[aria-label="Enviar"]');
  const button = buttons[buttons.length - 1];
  if (!(button instanceof HTMLButtonElement)) throw new Error('CONV03_E2E: no send button');
  return button;
}

function type(host: HTMLElement, value: string): void {
  const element = field(host);
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  if (setter === undefined) throw new Error('CONV03_E2E: no native value setter');
  act(() => {
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function waitForTurn(ms = THINK_WAIT_MS): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function send(host: HTMLElement, text: string): Promise<void> {
  type(host, text);
  act(() => {
    sendButton(host).click();
  });
  await waitForTurn();
}

function occurrences(host: HTMLElement, text: string): number {
  return (host.textContent ?? '').split(text).length - 1;
}

afterEach(() => {
  while (mounted.length > 0) mounted.pop()?.();
  document.body.innerHTML = '';
});

/* ============================== the product ============================= */

describe('P01 · the real landing mounts, and does nothing by itself', () => {
  it('shows the approved conversation and opens none before input', () => {
    const { host, client } = open('answered');

    // ONE input, and it is the landing's own: no hidden second field exists.
    expect(host.querySelectorAll('#cripqer-composer')).toHaveLength(1);
    expect(host.querySelectorAll('textarea')).toHaveLength(1);
    expect(host.textContent).toContain('Tengo una pastelería');
    expect(client.ask).not.toHaveBeenCalled();
    expect(h.navigate).not.toHaveBeenCalled();
  });
});

describe('P02 · one real turn through the mounted landing', () => {
  it('settles with the Advisor text and one assistant voice', async () => {
    const { host, client } = open('answered');

    await send(host, 'quiero una página con QR');

    expect(client.ask).toHaveBeenCalledTimes(1);
    expect(occurrences(host, SAFE_REPLY)).toBe(1);
    // The prototype's greeting must not be a second answer beside the Advisor's.
    expect(host.textContent).not.toContain('¿Qué quieres crear hoy?');
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it('accepts the keyboard path exactly like the button', async () => {
    const { host, client } = open('answered');

    type(host, 'hola por teclado');
    act(() => {
      field(host).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });
    await waitForTurn();

    expect(client.ask).toHaveBeenCalledTimes(1);
    expect(occurrences(host, SAFE_REPLY)).toBe(1);
  });
});

describe('P02b · the other contract states render in the mounted landing', () => {
  it('renders degraded, refused and fallback as one safe answer each', async () => {
    const cases: { scenario: LandingScenario; expected: string }[] = [
      { scenario: 'degraded', expected: SAFE_REPLY },
      { scenario: 'refused', expected: ASSISTANT_FALLBACK_TEXT },
      { scenario: 'fallback', expected: ASSISTANT_FALLBACK_TEXT }
    ];

    for (const { scenario, expected } of cases) {
      const { host, client } = open(scenario);
      await send(host, 'hola');

      expect(client.ask).toHaveBeenCalledTimes(1);
      expect(occurrences(host, expected)).toBe(1);
      expect(host.textContent).not.toContain('¿Qué quieres crear hoy?');
      expect(h.navigate).not.toHaveBeenCalled();
    }
  });
});

describe('P03 · multi-turn continuity in one conversation', () => {
  it('keeps three turns and shows all three answers', async () => {
    const { host, client } = open('answered');

    await send(host, 'uno');
    await send(host, 'dos');
    await send(host, 'tres');

    expect(client.ask).toHaveBeenCalledTimes(3);
    expect(occurrences(host, SAFE_REPLY)).toBe(3);
    const asked = client.ask.mock.calls.map((call) => (call[0] as { message: string }).message);
    expect(asked).toEqual(['uno', 'dos', 'tres']);
  });
});

describe('P05 · failure recovery in the product', () => {
  it('keeps the failed turn visible and recovers on the next message', async () => {
    const { host, client } = open('recover');

    await send(host, 'hola');
    expect(occurrences(host, ASSISTANT_FALLBACK_TEXT)).toBe(1);

    await send(host, 'otra pregunta');
    expect(client.ask).toHaveBeenCalledTimes(2);
    expect(occurrences(host, SAFE_REPLY)).toBe(1);
    // The failed attempt is still in the transcript, not rewritten as success.
    expect(occurrences(host, ASSISTANT_FALLBACK_TEXT)).toBe(1);
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it('renders hostile model text as characters, not as markup or a link', async () => {
    const { host } = open('hostile');

    await send(host, 'hola');

    // The landing's own template previews are images; the injected markup must
    // not have become one of them.
    expect(host.querySelectorAll('img[onerror], img[src="x"]')).toHaveLength(0);
    expect(host.querySelectorAll('a[href*="evil.invalid"]')).toHaveLength(0);
    expect(
      (globalThis as typeof globalThis & { __conv03_xss?: number }).__conv03_xss
    ).toBeUndefined();
    // It is present as TEXT: the surface renders the characters, not markup.
    expect(host.textContent).toContain('<img src=x');
    expect(host.innerHTML).not.toContain('<img src=x');
  });
});

describe('P06 · rapid submission cannot open a second turn', () => {
  it('accepts one turn when the visitor presses send again on the disabled button', async () => {
    const { host, client } = open('slow');

    type(host, 'hola');
    act(() => {
      sendButton(host).click();
    });
    await settle();
    expect(sendButton(host).disabled).toBe(true);
    act(() => {
      sendButton(host).click();
    });
    // Past the product's think delay: the single accepted turn has dispatched.
    await waitForTurn();

    expect(client.ask).toHaveBeenCalledTimes(1);
  });
});

describe('P07 · the landing survives the conversation', () => {
  it('keeps the approved content and controls around the thread', async () => {
    const { host } = open('answered');

    await send(host, 'hola');

    expect(host.querySelectorAll('#cripqer-composer')).toHaveLength(1);
    expect(host.textContent).toContain('Plantillas');
    expect(host.textContent).toContain('Ideas');
  });
});
