// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * CONV-03 · the landing session is wired to the Conversion Advisor.
 *
 * These tests drive the REAL hook with a scripted Advisor client, a mocked
 * router and a mocked Supabase client, so they fail if the product seam moves:
 *
 *   · a normal visitor turn reaches the Advisor exactly once;
 *   · "Créamela" on a ready landing never reaches a provider and still runs the
 *     existing creation path;
 *   · a card click never reaches a provider;
 *   · an Advisor failure becomes the facade's safe sentence, never the
 *     prototype's answer;
 *   · the rollback flag can select the prototype, and a malformed flag cannot.
 *
 * Every turn is also counted for visible assistant messages: the visitor must
 * never see two answers to one message.
 */

const h = vi.hoisted(() => ({
  navigate: vi.fn().mockResolvedValue(undefined),
  session: null as { user: { id: string; email: string; user_metadata: Record<string, unknown> } } | null,
  rpcCalls: [] as string[]
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => h.navigate
}));

vi.mock('../../../../lib/supabase/client', () => ({
  getBrowserSupabaseClient: () => ({
    auth: { getSession: async () => ({ data: { session: h.session }, error: null }) },
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
    rpc: (name: string) => {
      h.rpcCalls.push(name);
      return Promise.resolve({ data: { id: 'page-real-1' }, error: null });
    }
  })
}));

import { useCripqerSession } from '../useCripqerSession';
import { ASSISTANT_FALLBACK_TEXT } from '../../assistant/contracts';
import type { ConversionAdvisorClient } from '../../assistant/advisors/contract';
import type { AssistantTurnResult } from '../../../../lib/conversion-advisor/integration/contract';

const SESSION = '3f0c1e2a-4b5d-4e6f-8a9b-0c1d2e3f4a5b';

function scriptedClient(reply: string): ConversionAdvisorClient & {
  ask: ReturnType<typeof vi.fn>;
} {
  const result: AssistantTurnResult = {
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
  return { ask: vi.fn(async () => result) };
}

function renderSession(options: Parameters<typeof useCripqerSession>[1] = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const result = { current: undefined as unknown as ReturnType<typeof useCripqerSession> };
  function Probe() {
    result.current = useCripqerSession('discover', options);
    return null;
  }
  act(() => {
    root.render(React.createElement(Probe));
  });
  return {
    result,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    }
  };
}

async function send(result: { current: ReturnType<typeof useCripqerSession> }, text: string, ms = 1_200) {
  await act(async () => {
    result.current.send(text);
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function select(result: { current: ReturnType<typeof useCripqerSession> }, id: Parameters<ReturnType<typeof useCripqerSession>['selectTemplate']>[0]) {
  await act(async () => {
    result.current.selectTemplate(id);
    await vi.advanceTimersByTimeAsync(900);
  });
}

function assistantMessages(session: ReturnType<typeof useCripqerSession>) {
  return session.messages.filter((message) => message.role === 'assistant');
}

beforeEach(() => {
  (globalThis as Record<string, unknown>)['IS_REACT_ACT_ENVIRONMENT'] = true;
  (import.meta.env as Record<string, unknown>)['VITE_LANDING_TEMPLATE_SELECTION_FROZEN'] = 'false';
  (import.meta.env as Record<string, unknown>)['VITE_LANDING_ASSISTANT_PROVIDER'] = 'advisor';
  h.navigate.mockClear();
  h.rpcCalls.length = 0;
  h.session = null;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  delete (import.meta.env as Record<string, unknown>)['VITE_LANDING_ASSISTANT_PROVIDER'];
});

describe('CONV-03 · a normal turn reaches the Conversion Advisor once', () => {
  it('sends the visitor message through the Advisor and shows its answer', async () => {
    const client = scriptedClient('¡Muy bien! ¿Qué negocio tienes?');
    const { result, unmount } = renderSession({ advisorTransport: client });

    await send(result, 'Hola, ¿cómo estás?');

    expect(client.ask).toHaveBeenCalledTimes(1);
    expect((client.ask.mock.calls[0]?.[0] as { message: string }).message).toBe(
      'Hola, ¿cómo estás?'
    );
    expect(assistantMessages(result.current)).toHaveLength(1);
    expect(assistantMessages(result.current)[0]?.text).toBe('¡Muy bien! ¿Qué negocio tienes?');
    unmount();
  });

  it('records one visible answer per visitor message', async () => {
    const client = scriptedClient('Cuéntame más.');
    const { result, unmount } = renderSession({ advisorTransport: client });

    await send(result, 'Hola');
    await send(result, '¿Qué es Cripqer?');

    expect(client.ask).toHaveBeenCalledTimes(2);
    expect(result.current.messages.filter((m) => m.role === 'user')).toHaveLength(2);
    expect(assistantMessages(result.current)).toHaveLength(2);
    unmount();
  });

  it('turns an Advisor refusal into one fixed product sentence', async () => {
    const client: ConversionAdvisorClient = {
      ask: vi.fn(async () => ({ ok: false, code: 'SESSION_UNKNOWN', message: '' }) as AssistantTurnResult)
    };
    const { result, unmount } = renderSession({ advisorTransport: client });

    await send(result, 'Hola');

    expect(assistantMessages(result.current)).toHaveLength(1);
    expect(assistantMessages(result.current)[0]?.text).toBe(
      'Se me perdió el hilo de la conversación. ¿Me lo repites?'
    );
    unmount();
  });

  it('answers a thrown transport with the facade fallback, never with the prototype', async () => {
    const client: ConversionAdvisorClient = {
      ask: async () => {
        throw new Error('advisor turn timed out');
      }
    };
    const { result, unmount } = renderSession({ advisorTransport: client });

    await send(result, 'Hola, ¿cómo estás?');

    expect(assistantMessages(result.current)).toHaveLength(1);
    expect(assistantMessages(result.current)[0]?.text).toBe(ASSISTANT_FALLBACK_TEXT);
    expect(assistantMessages(result.current)[0]?.text).not.toContain('¿Qué quieres crear hoy?');
    unmount();
  });
});

describe('CONV-03 · deterministic commands never cost a provider call', () => {
  it('a card click selects the style with zero Advisor calls', async () => {
    const client = scriptedClient('No debería verme.');
    const { result, unmount } = renderSession({ advisorTransport: client });

    await select(result, 'warm_care');

    expect(client.ask).not.toHaveBeenCalled();
    expect(result.current.context.template.selectedTemplateId).toBe('warm_care');
    expect(assistantMessages(result.current)).toHaveLength(1);
    unmount();
  });

  it('a ready landing creates the page with zero Advisor calls', async () => {
    const client = scriptedClient('Hablemos de tu negocio.');
    const { result, unmount } = renderSession({ advisorTransport: client });

    await send(result, 'Tengo una veterinaria.');
    await send(result, 'Quiero que me contacten por WhatsApp.');
    await select(result, 'warm_care');

    const callsBeforeCreate = client.ask.mock.calls.length;
    const messagesBeforeCreate = result.current.messages.length;

    await send(result, 'Créamela.');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    // Zero model involvement in the creation instruction itself.
    expect(client.ask.mock.calls.length).toBe(callsBeforeCreate);
    const asked = client.ask.mock.calls.map((call) => (call[0] as { message: string }).message);
    expect(asked).not.toContain('Créamela.');

    // Exactly one assistant answer, and it is the deterministic one.
    expect(result.current.messages.length).toBe(messagesBeforeCreate + 2);
    expect(assistantMessages(result.current).at(-1)?.text).toBe(
      'Perfecto. Estoy preparando tu página.'
    );

    // The existing creation path ran: pending document, auth overlay, no write.
    expect(result.current.handoff).not.toBeNull();
    expect(result.current.authPrompt).toBe('create');
    expect(h.rpcCalls).toEqual([]);
    expect(h.navigate).not.toHaveBeenCalled();
    unmount();
  });

  it('a not-ready landing asks for the missing slot instead of creating', async () => {
    const client = scriptedClient('No debería verme.');
    const { result, unmount } = renderSession({ advisorTransport: client });

    await send(result, 'Créamela.');

    expect(client.ask).not.toHaveBeenCalled();
    expect(assistantMessages(result.current)).toHaveLength(1);
    expect(assistantMessages(result.current)[0]?.text).toContain('¿Para qué tipo de negocio');
    expect(result.current.handoff).toBeNull();
    expect(result.current.authPrompt).toBeNull();
    expect(h.rpcCalls).toEqual([]);
    unmount();
  });
});

describe('CONV-03 · the rollback flag selects exactly one brain', () => {
  it('uses the local prototype only when the flag is exactly "local"', async () => {
    (import.meta.env as Record<string, unknown>)['VITE_LANDING_ASSISTANT_PROVIDER'] = 'local';
    const client = scriptedClient('El asesor no debería responder.');
    const { result, unmount } = renderSession({ advisorTransport: client });

    await send(result, 'Hola, ¿cómo estás?');

    expect(client.ask).not.toHaveBeenCalled();
    expect(assistantMessages(result.current)).toHaveLength(1);
    expect(assistantMessages(result.current)[0]?.text).toContain('¿Qué quieres crear hoy?');
    unmount();
  });

  it('fails safe to the Advisor for a malformed flag', async () => {
    (import.meta.env as Record<string, unknown>)['VITE_LANDING_ASSISTANT_PROVIDER'] = 'locl';
    const client = scriptedClient('Sigo siendo yo.');
    const { result, unmount } = renderSession({ advisorTransport: client });

    await send(result, 'Hola, ¿cómo estás?');

    expect(client.ask).toHaveBeenCalledTimes(1);
    expect(assistantMessages(result.current)[0]?.text).toBe('Sigo siendo yo.');
    unmount();
  });
});
