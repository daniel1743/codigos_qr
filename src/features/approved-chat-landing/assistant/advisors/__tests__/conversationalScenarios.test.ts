/**
 * CONV-03 · the thirteen scripted public-landing scenarios.
 *
 * These are the turns the owner will recognise from the approved conversation.
 * The Advisor's text is scripted here (the real model is a later, paid canary),
 * so what these tests hold in place is everything the CODE decides:
 *
 *   · one provider call per turn, and the reply reaches the visitor verbatim;
 *   · every action is planned deterministically from the message and the
 *     catalog, so no template id can be invented;
 *   · no conversational turn can carry `CREATE_PAGE` — creation is the separate
 *     deterministic command — even when the model's prose claims it acted;
 *   · no action ever carries a price, and design changes are never turned into
 *     an action the landing would execute.
 */
import { describe, expect, it, vi } from 'vitest';

import { applyAgentResponse, emptyContext } from '../../../utils/agent';
import { templates } from '../../../data/templates';
import { createConversionAdvisorProvider } from '../provider';
import type { ConversionAdvisorClient } from '../contract';
import type { AssistantTurnResult } from '../../../../../lib/conversion-advisor/integration/contract';
import type { AgentAction, BusinessContext } from '../../../types/cripqer';

const SESSION = '3f0c1e2a-4b5d-4e6f-8a9b-0c1d2e3f4a5b';
const CATALOG: ReadonlySet<string> = new Set(templates.map((template) => template.id));

/** The only action types a conversational turn may produce. */
const TURN_ACTION_TYPES = new Set<AgentAction['type']>([
  'SHOW_TEMPLATES',
  'RECOMMEND_TEMPLATES',
  'PREVIEW_TEMPLATE',
  'SELECT_TEMPLATE',
  'SHOW_OPTIONS',
  'SHOW_READY',
  'UPDATE_BUSINESS_CONTEXT',
  'OPEN_TEMPLATE_DRAWER'
]);

type AnsweredTurn = Extract<AssistantTurnResult, { ok: true }>;

function replyResult(reply: string): AnsweredTurn {
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

function scripted(): ConversionAdvisorClient & { ask: ReturnType<typeof vi.fn> } {
  const ask = vi.fn(async (input: { message: string }) => replyResult(`Respuesta a: ${input.message}`));
  return { ask } as unknown as ConversionAdvisorClient & { ask: ReturnType<typeof vi.fn> };
}

/** One turn through the exact product bridge, then through the product reducer. */
async function turn(
  client: ConversionAdvisorClient,
  context: BusinessContext,
  message: string
): Promise<{ response: Awaited<ReturnType<ReturnType<typeof createConversionAdvisorProvider>['respond']>>; context: BusinessContext }> {
  const provider = createConversionAdvisorProvider({ client });
  const response = await provider.respond({
    intent: { kind: 'message', text: message },
    context,
    history: []
  });
  const applied = applyAgentResponse(context, response);
  return { response, context: applied.context };
}

function actionIds(actions: readonly AgentAction[]): string[] {
  const ids: string[] = [];
  for (const action of actions) {
    if (action.type === 'SELECT_TEMPLATE' || action.type === 'PREVIEW_TEMPLATE') ids.push(action.id);
    if (action.type === 'RECOMMEND_TEMPLATES') ids.push(...action.ids);
  }
  return ids;
}

describe('CONV-03 · the approved public-landing conversation', () => {
  it('runs the thirteen scripted turns with one call, one reply and no model action', async () => {
    const client = scripted();
    let context = emptyContext();

    const scenarios: {
      message: string;
      check: (
        response: Awaited<ReturnType<typeof turn>>['response'],
        context: BusinessContext,
        before: BusinessContext
      ) => void;
    }[] = [
      {
        message: 'Hola, ¿cómo estás?',
        check: (response) => {
          expect(response.actions).toEqual([{ type: 'SHOW_OPTIONS', options: expect.any(Array) }]);
        }
      },
      {
        message: '¿Qué es Cripqer?',
        check: (response) => {
          expect(response.actions.some((action) => action.type === 'SHOW_OPTIONS')).toBe(true);
        }
      },
      {
        message: 'Tengo una veterinaria.',
        check: (response, next) => {
          const patch = response.actions.find((action) => action.type === 'UPDATE_BUSINESS_CONTEXT');
          expect(patch && patch.type === 'UPDATE_BUSINESS_CONTEXT' && patch.patch.type).toBe('pets');
          expect(next.businessIdentity.type).toBe('pets');
        }
      },
      {
        message: 'Quiero mostrar mis servicios.',
        check: (response) => {
          expect(response.actions.some((action) => action.type === 'UPDATE_BUSINESS_CONTEXT')).toBe(true);
        }
      },
      {
        message: 'Quiero un catálogo.',
        check: (response) => {
          expect(response.actions).toContainEqual({ type: 'OPEN_TEMPLATE_DRAWER' });
        }
      },
      {
        message: 'Quiero que me contacten por WhatsApp.',
        check: (response, next) => {
          expect(next.primaryChannel).toBe('whatsapp');
        }
      },
      {
        message: 'Muéstrame otras.',
        check: (response) => {
          // Whatever the planner chose, it came from the catalog.
          expect(actionIds(response.actions).every((id) => CATALOG.has(id))).toBe(true);
        }
      },
      {
        message: 'La segunda.',
        check: (response, next, before) => {
          const selected = response.actions.find((action) => action.type === 'SELECT_TEMPLATE');
          expect(selected).toBeDefined();
          expect(selected && selected.type === 'SELECT_TEMPLATE' && selected.id).toBe(
            before.session.lastShownTemplates[1]
          );
          expect(next.template.selectedTemplateId).toBe(before.session.lastShownTemplates[1]);
        }
      },
      {
        message: 'Quiero algo elegante.',
        check: (response) => {
          expect(actionIds(response.actions).every((id) => CATALOG.has(id))).toBe(true);
          expect(response.actions.some((action) => action.type === 'CREATE_PAGE')).toBe(false);
        }
      },
      {
        message: 'Quiero ponerla verde y cambiar mi foto.',
        check: (response) => {
          // A design wish is not an action: nothing here rewrites the page.
          expect(response.actions).not.toContainEqual({ type: 'CREATE_PAGE' });
          expect(response.actions.every((action) => TURN_ACTION_TYPES.has(action.type))).toBe(true);
        }
      },
      {
        message: 'Créamela.',
        check: (response) => {
          // The conversational path can only show the ready card; the command
          // itself is deterministic and lives outside the provider.
          expect(response.actions.some((action) => action.type === 'CREATE_PAGE')).toBe(false);
        }
      },
      {
        message: '¿Cuánto cuesta?',
        check: (response) => {
          expect(JSON.stringify(response.actions)).not.toMatch(/\$|CLP|precio|plan/i);
        }
      },
      {
        message: '¿La IA puede cambiar mi diseño?',
        check: (response) => {
          expect(JSON.stringify(response.actions)).not.toMatch(/diseño|design|cambiar/i);
        }
      }
    ];

    for (const [index, scenario] of scenarios.entries()) {
      const before = context;
      const outcome = await turn(client, context, scenario.message);

      // The model's sentence is forwarded, never replaced by rule-based prose.
      expect(outcome.response.text).toBe(`Respuesta a: ${scenario.message}`);
      expect(outcome.response.metadata.provider).toBe('conversion-advisor');
      expect(outcome.response.metadata.model).toBe('deepseek-flash');
      // One visible answer per turn.
      expect(outcome.response.text.length).toBeGreaterThan(0);
      // Only the eight deterministic actions, and only catalog ids.
      expect(
        outcome.response.actions.every((action) => TURN_ACTION_TYPES.has(action.type))
      ).toBe(true);
      expect(actionIds(outcome.response.actions).every((id) => CATALOG.has(id))).toBe(true);
      // The client is called exactly once per scripted turn.
      expect(client.ask).toHaveBeenCalledTimes(index + 1);
      expect((client.ask.mock.calls[index]?.[0] as { message: string }).message).toBe(
        scenario.message
      );

      scenario.check(outcome.response, outcome.context, before);
      context = outcome.context;
    }

    expect(client.ask).toHaveBeenCalledTimes(13);
    // The landing is now ready: type, goal, style and channel are all known.
    expect(context.businessIdentity.type).not.toBeNull();
    expect(context.template.selectedTemplateId).not.toBeNull();
    expect(context.primaryChannel).not.toBeNull();
  });

  it('does not let a model sentence that claims creation become an action', async () => {
    const client: ConversionAdvisorClient = {
      ask: vi.fn(async () =>
        replyResult('Listo, ya creé tu página y elegí Dark Craft por ti.')
      )
    };
    const provider = createConversionAdvisorProvider({ client });

    const response = await provider.respond({
      intent: { kind: 'message', text: 'Créamela.' },
      context: emptyContext(),
      history: []
    });

    expect(response.actions.some((action) => action.type === 'CREATE_PAGE')).toBe(false);
    expect(response.text).toBe('Listo, ya creé tu página y elegí Dark Craft por ti.');
  });

  it('keeps the call count at one even for a degraded turn', async () => {
    const client: ConversionAdvisorClient = {
      ask: vi.fn(
        async () =>
          ({
            ok: true,
            data: {
              ...replyResult('Estoy con menos contexto, pero aquí sigo.').data,
              degraded: true
            }
          }) as AssistantTurnResult
      )
    };

    const outcome = await turn(client, emptyContext(), 'Hola, ¿cómo estás?');

    expect(client.ask).toHaveBeenCalledTimes(1);
    expect(outcome.response.metadata.fallback).toBe(true);
    expect(outcome.response.text).toBe('Estoy con menos contexto, pero aquí sigo.');
  });
});
