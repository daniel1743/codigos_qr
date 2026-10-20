import { describe, expect, it, vi } from 'vitest';
import {
  createBusinessContextStore,
  deriveBusinessReadiness,
  describeBusinessContext,
  mergeBusinessContext } from
'../businessContext';
import { emptyContext } from '../../utils/agent';
import { respondLocal } from '../../assistant/localProvider';
import { getTemplate } from '../../utils/templates';
import type { BusinessContext } from '../../types/cripqer';

/** Business data captured the way the conversation captures it. */
function conversationContext(): BusinessContext {
  const store = createBusinessContextStore();
  store.patch({ name: 'Santos', type: 'barbershop', description: 'Barbería clásica' });
  store.patch({ goal: 'bookings', channel: 'whatsapp' });
  return store.get();
}

describe('BusinessContext store', () => {
  it('arranca vacío y mantiene una referencia estable', () => {
    const store = createBusinessContextStore();
    expect(store.get()).toEqual(emptyContext());
    const snapshot = store.get();
    expect(store.get()).toBe(snapshot);
    expect(store.set(snapshot)).toBe(snapshot);
  });

  it('1) selecciona una plantilla sin tocar los datos del negocio', () => {
    const store = createBusinessContextStore(conversationContext());
    const before = store.get();
    const next = store.selectTemplate('dark_craft');
    const dark = getTemplate('dark_craft');
    expect(next.template.selectedTemplateId).toBe('dark_craft');
    expect(next.template.templateFamily).toBe(dark.name);
    expect(next.template.visualPersonality).toBe(dark.personality);
    expect(next.template.heroVariant).toBe(dark.hero.variant);
    expect(next.businessIdentity).toEqual(before.businessIdentity);
    expect(next.primaryGoal).toBe(before.primaryGoal);
    expect(next.primaryChannel).toBe(before.primaryChannel);
  });

  it('no cambia la industria al elegir una plantilla de otra vertical', () => {
    const store = createBusinessContextStore();
    store.patch({ type: 'bakery' });
    store.selectTemplate('dark_craft');
    expect(store.get().businessIdentity.type).toBe('bakery');
  });

  it('2) cambiar de plantilla solo cambia el estilo', () => {
    const store = createBusinessContextStore(conversationContext());
    store.selectTemplate('food_story');
    const before = store.get();
    const after = store.selectTemplate('minimal_premium');
    expect(after.template.selectedTemplateId).toBe('minimal_premium');
    expect(after.businessIdentity).toEqual(before.businessIdentity);
    expect(after.primaryGoal).toBe('bookings');
    expect(after.primaryChannel).toBe('whatsapp');
  });

  it('3) captura tipo, objetivo y canal de forma incremental', () => {
    const store = createBusinessContextStore();
    store.patch({ type: 'bakery' });
    expect(store.get().businessIdentity.type).toBe('bakery');
    expect(store.get().primaryGoal).toBe('orders');
    store.patch({ channel: 'whatsapp' });
    expect(store.get().primaryChannel).toBe('whatsapp');
    expect(store.get().businessIdentity.name).toBeNull();
  });

  it('3b) captura lo mismo desde frases del agente prototipo', () => {
    const store = createBusinessContextStore();
    store.applyResponse(respondLocal({ intent: { kind: 'message', text: 'Tengo una pastelería y hago tortas personalizadas.' }, context: store.get(), history: [] }));
    expect(store.get().businessIdentity.type).toBe('bakery');
    expect(store.get().primaryGoal).toBe('orders');

    store.applyResponse(respondLocal({ intent: { kind: 'message', text: 'Quiero que me contacten por WhatsApp.' }, context: store.get(), history: [] }));
    expect(store.get().businessIdentity.type).toBe('bakery');
    expect(store.get().primaryChannel).toBe('whatsapp');
    expect(store.get().businessIdentity.name).toBeNull();
  });

  it('4) conserva el contexto al volver a Plantillas', () => {
    const store = createBusinessContextStore(conversationContext());
    const before = store.selectTemplate('dark_craft');
    store.applyResponse({
      text: 'Aquí están las que viste al entrar.',
      actions: [{ type: 'SHOW_TEMPLATES', scope: 'INITIAL' }]
    });
    const after = store.get();
    expect(after.businessIdentity).toEqual(before.businessIdentity);
    expect(after.primaryGoal).toBe(before.primaryGoal);
    expect(after.primaryChannel).toBe(before.primaryChannel);
    expect(after.template).toEqual(before.template);
    expect(after.session.lastShownTemplates).toEqual(after.session.initialTemplates);
  });

  it('5) reset devuelve un contexto vacío', () => {
    const store = createBusinessContextStore(conversationContext());
    store.selectTemplate('dark_craft');
    expect(store.reset()).toEqual(emptyContext());
    expect(store.get()).toEqual(emptyContext());
  });

  it('notifica a los suscriptores y permite desuscribirse', () => {
    const store = createBusinessContextStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.patch({ type: 'bakery' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.patch({ channel: 'whatsapp' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('update conserva lo no mencionado y permite limpiar con null', () => {
    const store = createBusinessContextStore(conversationContext());
    store.update({ session: { initialTemplates: ['warm_care'] } });
    expect(store.get().businessIdentity.name).toBe('Santos');
    expect(store.get().session.initialTemplates).toEqual(['warm_care']);
    store.update({ businessIdentity: { type: null }, primaryGoal: null });
    expect(store.get().businessIdentity.type).toBeNull();
    expect(store.get().primaryGoal).toBeNull();
    expect(store.get().businessIdentity.name).toBe('Santos');
  });
});

describe('deriveBusinessReadiness', () => {
  it('refleja el gate del prototipo', () => {
    const empty = emptyContext();
    expect(deriveBusinessReadiness(empty).readyForPage).toBe(false);

    const bakery = mergeBusinessContext(empty, {
      businessIdentity: { type: 'bakery' },
      primaryChannel: 'whatsapp',
      template: { selectedTemplateId: 'food_story' }
    });
    expect(deriveBusinessReadiness(bakery).hasTemplate).toBe(true);
    expect(deriveBusinessReadiness(bakery).readyForPage).toBe(true);

    const realEstate = mergeBusinessContext(empty, {
      businessIdentity: { type: 'real_estate' },
      primaryChannel: 'whatsapp',
      template: { selectedTemplateId: 'professional_trust' }
    });
    expect(deriveBusinessReadiness(realEstate).readyForPage).toBe(false);
    expect(deriveBusinessReadiness(realEstate).hasGoal).toBe(false);

    const withGoal = mergeBusinessContext(realEstate, { primaryGoal: 'leads' });
    expect(deriveBusinessReadiness(withGoal).readyForPage).toBe(true);
  });
});

describe('describeBusinessContext', () => {
  it('expone las etiquetas derivadas sin almacenar copias', () => {
    const store = createBusinessContextStore(conversationContext());
    store.selectTemplate('dark_craft');
    const view = describeBusinessContext(store.get());
    const dark = getTemplate('dark_craft');
    expect(view.businessName).toBe('Santos');
    expect(view.businessTypeId).toBe('barbershop');
    expect(view.businessTypeLabel).toBe('Barbería');
    expect(view.goalId).toBe('bookings');
    expect(view.goalLabel).toBe('Conseguir reservas');
    expect(view.primaryChannelLabel).toBe('WhatsApp');
    expect(view.visualFamily).toBe(dark.name);
    expect(view.selectedStyle).toBe(dark.personality);
    expect(view.selectedTemplateId).toBe('dark_craft');
    expect(view.selectedTemplateName).toBe(dark.name);
  });
});
