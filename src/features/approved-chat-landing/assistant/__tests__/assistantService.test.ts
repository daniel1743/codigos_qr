import { describe, expect, it } from 'vitest';
import { createAssistantService } from '../service';
import { LOCAL_PROVIDER_ID, createLocalAssistantProvider, respondLocal } from '../localProvider';
import { ASSISTANT_FALLBACK_TEXT } from '../contracts';
import { afterSelection, applyAgentResponse, emptyContext, runAgent } from '../../utils/agent';
import { createBusinessContextStore, mergeBusinessContext } from '../../state/businessContext';
import type { AssistantProvider, AssistantResponse } from '../contracts';
import type { BusinessContext, TemplateId } from '../../types/cripqer';

const service = createAssistantService({ provider: createLocalAssistantProvider() });

function filledContext(): BusinessContext {
  const store = createBusinessContextStore();
  store.patch({ name: 'Santos', type: 'barbershop', description: 'Barbería clásica' });
  store.patch({ goal: 'bookings', channel: 'whatsapp' });
  return store.get();
}

function readyContext(): BusinessContext {
  const store = createBusinessContextStore(filledContext());
  store.selectTemplate('dark_craft');
  return store.get();
}

describe('local provider equivalence', () => {
  it('1) same input and context produce the previous runAgent response', () => {
    const empty = emptyContext();
    const filled = filledContext();
    const ready = readyContext();
    const cases: { text: string; context: BusinessContext }[] = [
      { text: 'Hola', context: empty },
      { text: '¿Qué es Cripqer?', context: empty },
      { text: '¿Qué puedo crear?', context: empty },
      { text: 'Muéstrame un ejemplo', context: empty },
      { text: 'Tengo una pastelería y hago tortas personalizadas.', context: empty },
      { text: 'Quiero que me contacten por WhatsApp.', context: filled },
      { text: 'Quiero crear mi página', context: empty },
      { text: 'Ya, créamela', context: ready },
      { text: 'Muéstrame algo más elegante', context: filled },
      { text: 'Muéstrame otra parecida', context: ready },
      { text: 'Muéstrame las plantillas que vi al principio', context: ready },
      { text: 'Es otro tipo de negocio', context: filled },
      { text: 'texto sin ninguna intención reconocible', context: filled }
    ];
    cases.forEach(({ text, context }) => {
      const legacy = runAgent(text, context);
      const viaProvider = respondLocal({ intent: { kind: 'message', text }, context, history: [] });
      expect(viaProvider.text).toBe(legacy.text);
      expect(viaProvider.actions).toEqual(legacy.actions);
    });
  });

  it('2) template-selection matches the previous afterSelection response', () => {
    const ids: TemplateId[] = ['dark_craft', 'food_story', 'minimal_premium'];
    ids.forEach((id) => {
      const selected = createBusinessContextStore(filledContext()).selectTemplate(id);
      const legacy = afterSelection(selected, id);
      const viaProvider = respondLocal({ intent: { kind: 'template-selection', templateId: id }, context: selected, history: [] });
      expect(viaProvider.text).toBe(legacy.text);
      expect(viaProvider.actions).toEqual(legacy.actions);
    });
  });

  it('2b) template-selection still works when the context was not pre-selected', () => {
    const res = respondLocal({ intent: { kind: 'template-selection', templateId: 'dark_craft' }, context: filledContext(), history: [] });
    expect(res.actions.some((a) => a.type === 'RECOMMEND_TEMPLATES')).toBe(false);
    expect(res.actions.some((a) => a.type === 'SHOW_READY')).toBe(true);
  });

  it('the local provider ignores history, like the previous runAgent call', () => {
    const withHistory = respondLocal({ intent: { kind: 'message', text: 'Hola' }, context: emptyContext(), history: [{ id: 'm1', role: 'user', text: 'antes' }] });
    const without = respondLocal({ intent: { kind: 'message', text: 'Hola' }, context: emptyContext(), history: [] });
    expect(withHistory).toEqual(without);
    expect(withHistory.metadata.provider).toBe(LOCAL_PROVIDER_ID);
    expect(withHistory.metadata.fallback).toBe(false);
  });
});

describe('AssistantService', () => {
  it('3) asking to create the page with no business type replies with SHOW_OPTIONS', async () => {
    const out = await service.sendMessage('Quiero crear mi página', emptyContext(), []);
    expect(out.ok).toBe(true);
    expect(out.error).toBe(null);
    expect(out.response.metadata.provider).toBe(LOCAL_PROVIDER_ID);
    expect(out.response.actions.some((a) => a.type === 'SHOW_OPTIONS')).toBe(true);
  });

  it('4) recommends templates once the business type is known', async () => {
    const context = mergeBusinessContext(emptyContext(), {
      businessIdentity: { type: 'bakery' },
      primaryGoal: 'orders'
    });
    const out = await service.sendMessage('Tengo una pastelería y hago tortas', context, []);
    expect(out.response.actions.some((a) => a.type === 'RECOMMEND_TEMPLATES')).toBe(true);
  });

  it('5) walks the conversation until CREATE_PAGE', async () => {
    const store = createBusinessContextStore();
    const step = async (text: string) => {
      const out = await service.sendMessage(text, store.get(), []);
      store.applyResponse(out.response);
      return out;
    };

    await step('Tengo una pastelería y hago tortas personalizadas.');
    await step('Quiero que me contacten por WhatsApp.');

    const selected = store.selectTemplate('food_story');
    const selectionOut = await service.selectTemplate('food_story', selected, []);
    store.applyResponse(selectionOut.response);

    const out = await step('Ya, créamela');
    expect(out.response.actions.some((a) => a.type === 'CREATE_PAGE')).toBe(true);
  });

  it('6) a failing provider is contained: no actions, no context change, no page', async () => {
    let reported = 0;
    const failing: AssistantProvider = {
      id: 'failing-provider',
      respond: async () => {
        throw new Error('boom');
      }
    };
    const brokenService = createAssistantService({
      provider: failing,
      onProviderError: () => {
        reported += 1;
      }
    });
    const context = readyContext();
    const out = await brokenService.sendMessage('Ya, créamela', context, []);

    expect(out.ok).toBe(false);
    expect(out.error).toBe('boom');
    expect(out.response.text).toBe(ASSISTANT_FALLBACK_TEXT);
    expect(out.response.actions).toEqual([]);
    expect(out.response.metadata.fallback).toBe(true);
    expect(reported).toBe(1);

    const applied = applyAgentResponse(context, out.response);
    expect(applied.context).toEqual(context);
    expect(applied.effects.create).toBe(false);
    expect(applied.attachment).toBe(undefined);
  });

  it('7) the provider is injected, never edited into components', async () => {
    const custom: AssistantProvider = {
      id: 'test-provider',
      respond: async (request) => ({
        text: request.intent.kind === 'message' ? 'eco: ' + request.intent.text : 'eco: ' + request.intent.templateId,
        actions: [],
        metadata: { provider: 'test-provider', model: 'test-model', fallback: false }
      })
    };
    const customService = createAssistantService({ provider: custom });
    expect(customService.providerId).toBe('test-provider');

    const out = await customService.sendMessage('hola', emptyContext(), []);
    expect(out.ok).toBe(true);
    expect(out.response.text).toBe('eco: hola');
    expect(out.response.metadata.model).toBe('test-model');

    const sel = await customService.selectTemplate('dark_craft', emptyContext(), []);
    expect(sel.response.text).toBe('eco: dark_craft');
  });

  it('8) awaits asynchronous providers', async () => {
    const deferred: AssistantProvider = {
      id: 'async-provider',
      respond: (request) => new Promise<AssistantResponse>((resolve) => {
        setTimeout(() => resolve({
          text: 'deferred: ' + (request.intent.kind === 'message' ? request.intent.text : ''),
          actions: [],
          metadata: { provider: 'async-provider', model: null, fallback: false }
        }), 5);
      })
    };
    const customService = createAssistantService({ provider: deferred });
    const out = await customService.sendMessage('tarde', emptyContext(), []);
    expect(out.ok).toBe(true);
    expect(out.response.text).toBe('deferred: tarde');
  });

  it('9) exposes the generic provider-independent entry point', async () => {
    const out = await service.request({ kind: 'message', text: 'Hola' }, emptyContext(), []);
    expect(out.ok).toBe(true);
    expect(out.response.text).toBe(runAgent('Hola', emptyContext()).text);
  });
});
