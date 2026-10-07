import { initialTemplateIds } from '../data/templates';
import { applyAgentResponse, applySelection, emptyContext, runAgent } from './agent';
import type { BusinessContext, ChatMessage, Stage, StartAt } from '../types/cripqer';

interface Seed {
  stage: Stage;
  context: BusinessContext;
  messages: ChatMessage[];
}

/** Pre-built sessions so each state of the prototype can be reviewed directly. */
export function buildSeed(startAt: StartAt): Seed {
  const base = emptyContext();
  if (startAt === 'discover') return { stage: 'discover', context: base, messages: [] };

  let ctx: BusinessContext = { ...base, session: { ...base.session, initialTemplates: initialTemplateIds } };

  if (startAt === 'converse') {
    const userText = 'Tengo una pastelería. Hago tortas personalizadas y quiero que me contacten por WhatsApp.';
    const applied = applyAgentResponse(ctx, runAgent(userText, ctx));
    const res = runAgent(userText, ctx);
    return {
      stage: 'converse',
      context: applied.context,
      messages: [
      { id: 'seed-u1', role: 'user', text: userText },
      { id: 'seed-a1', role: 'assistant', text: res.text, attachment: applied.attachment }]

    };
  }

  const userText = 'Tengo una barbería llamada Santos. Quiero conseguir reservas por WhatsApp y me gusta la página negra que vi arriba.';
  const res = runAgent(userText, ctx);
  const applied = applyAgentResponse(ctx, res);
  ctx = applySelection(applied.context, 'dark_craft');
  return {
    stage: 'editor',
    context: ctx,
    messages: [
    { id: 'seed-u1', role: 'user', text: userText },
    { id: 'seed-a1', role: 'assistant', text: res.text, attachment: applied.attachment },
    { id: 'seed-u2', role: 'user', text: 'Ya, créamela.' },
    { id: 'seed-a2', role: 'assistant', text: 'Perfecto. Estoy preparando tu página.' }]

  };
}