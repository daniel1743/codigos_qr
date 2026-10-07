import { templates } from '../data/templates';
import { businessOptions, businessTypes, channelOptions, channels, goals } from '../data/business';
import { getBusinessType, getTemplate } from './templates';
import { rankFamilies } from './recommend';
import type {
  AgentAction,
  AgentResponse,
  Attachment,
  BusinessContext,
  ContextPatch,
  TemplateId } from
'../types/cripqer';

/*
 * PROTOTYPE-ONLY local agent. Not connected to any LLM.
 * Production: Conversational UI → Cripqer Assistant Service → LLM provider (provider-independent).
 * The service must return the same structured AgentResponse (text + AgentAction[] + context patch);
 * it never returns JSX or mutates the UI directly. Do not extend this file with more rules.
 */
export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function emptyContext(): BusinessContext {
  return {
    businessIdentity: { name: null, type: null, description: null },
    primaryGoal: null,
    primaryChannel: null,
    template: { selectedTemplateId: null, templateFamily: null, heroVariant: null, visualPersonality: null },
    session: { initialTemplates: [], lastShownTemplates: [] }
  };
}

/* ---------- Extraction ---------- */

function extractName(raw: string): string | undefined {
  const m = raw.match(/(?:llamad[ao]|se llama|nombre es|mi marca es)\s+["“']?([A-ZÁÉÍÓÚÑ0-9][\wÁÉÍÓÚÑáéíóúñ&'-]*(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ&'-]*){0,2})/);
  return m?.[1]?.replace(/[.,]$/, '');
}

export function extractContext(raw: string): ContextPatch {
  const t = ` ${normalize(raw)} `;
  const patch: ContextPatch = {};
  const name = extractName(raw);
  if (name) patch.name = name;
  const type = businessTypes.find((b) => b.keywords.some((k) => t.includes(k)));
  if (type) patch.type = type.id;
  // No exact match: still a real business. Never answer "we don't have a template for that".
  else if (/\b(soy|me dedico a|trabajo como|tengo un negocio de)\s+[a-z]{3,}/.test(t) && !/\b(soy nuevo|soy nueva)\b/.test(t)) patch.type = 'other';
  const channel = channels.find((c) => c.keywords.some((k) => t.includes(k)));
  if (channel) patch.channel = channel.id;
  const goal = goals.find((g) => g.keywords.some((k) => t.includes(k)));
  if (goal) patch.goal = goal.id;
  if ((type || patch.type) && raw.length > 20) patch.description = raw.trim();
  return patch;
}

export function applyPatch(ctx: BusinessContext, patch: ContextPatch): BusinessContext {
  const type = patch.type ?? ctx.businessIdentity.type;
  let goal = patch.goal ?? ctx.primaryGoal;
  if (!goal && type) goal = getBusinessType(type)?.goal ?? null;
  return {
    ...ctx,
    businessIdentity: {
      name: patch.name ?? ctx.businessIdentity.name,
      type,
      description: patch.description ?? ctx.businessIdentity.description
    },
    primaryGoal: goal,
    primaryChannel: patch.channel ?? ctx.primaryChannel
  };
}

export function applySelection(ctx: BusinessContext, id: TemplateId): BusinessContext {
  const t = getTemplate(id);
  return {
    ...ctx,
    template: { selectedTemplateId: id, templateFamily: t.name, heroVariant: t.hero.variant, visualPersonality: t.personality }
  };
}

/* ---------- Template resolution ---------- */

const REFERENCE_CUES = ['vi', 'arriba', 'principio', 'inicio', 'gusto', 'gusta', 'plantilla', 'estilo', 'pagina', 'esa', 'quiero la', 'usa la', 'elijo'];

function resolveTemplateReference(t: string, ctx: BusinessContext): TemplateId | null {
  const hasCue = REFERENCE_CUES.some((c) => new RegExp(`\\b${c}`).test(t));
  if (!hasCue) return null;
  const named = templates.find((tpl) => t.includes(normalize(tpl.name)));
  if (named) return named.id;
  const pool = [...ctx.session.lastShownTemplates, ...ctx.session.initialTemplates];
  const colorWords = ['negra', 'negro', 'oscura', 'oscuro', 'rosa', 'rosada', 'dorada', 'dorado', 'verde', 'gris', 'naranja', 'colorida', 'beige', 'azul', 'blanca', 'crema', 'roja'];
  const hasColor = colorWords.some((w) => new RegExp(`\\b${w}\\b`).test(t));
  if (!hasColor && !/\b(la|el) de (la|el)\b/.test(t)) return null;
  const match = (list: TemplateId[]) =>
  list.find((id) => getTemplate(id).descriptors.some((d) => new RegExp(`\\b${d}\\b`).test(t)));
  return match(pool) ?? match(templates.map((x) => x.id)) ?? null;
}

const ORDINALS: [RegExp, number][] = [
[/\b(primera|primer|1ra|la 1|uno)\b/, 0],
[/\b(segunda|2da|la 2|dos)\b/, 1],
[/\b(tercera|3ra|la 3|tres)\b/, 2],
[/\b(cuarta|la 4)\b/, 3],
[/\b(quinta|la 5)\b/, 4],
[/\b(ultima)\b/, -1]];


function resolveOrdinal(t: string, ctx: BusinessContext): TemplateId | null {
  const list = ctx.session.lastShownTemplates;
  if (!list.length || !/\b(quiero|elijo|me quedo|usa|dame|esa|la)\b/.test(t)) return null;
  for (const [re, idx] of ORDINALS) {
    if (re.test(t)) return list[idx === -1 ? list.length - 1 : idx] ?? null;
  }
  return null;
}

function recommendByTags(words: string[], exclude: TemplateId[] = []): TemplateId[] {
  const scored = templates.
  map((tpl) => ({ id: tpl.id, score: tpl.tags.filter((tag) => words.includes(tag)).length })).
  filter((s) => s.score > 0 && !exclude.includes(s.id)).
  sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.id);
}

function similarTo(ctx: BusinessContext): {base: TemplateId;ids: TemplateId[];} | null {
  const base = ctx.template.selectedTemplateId ?? ctx.session.lastShownTemplates[0] ?? null;
  if (!base) return null;
  const seen = ctx.session.lastShownTemplates;
  const related = getTemplate(base).related;
  const fresh = related.filter((id) => !seen.includes(id));
  const ids = (fresh.length >= 2 ? fresh : related).slice(0, 3);
  return { base, ids };
}

/* ---------- Next-step logic ---------- */

export function nextStep(ctx: BusinessContext, explicitCreate: boolean, lead = ''): AgentResponse {
  const type = getBusinessType(ctx.businessIdentity.type);
  const prefix = lead ? `${lead} ` : '';
  if (!type) {
    return {
      text: `${prefix}¿Para qué tipo de negocio es la página?`,
      actions: [{ type: 'SHOW_OPTIONS', options: businessOptions }]
    };
  }
  if (!ctx.primaryGoal && type.goalOptions) {
    return { text: `${prefix}${type.goalQuestion}`, actions: [{ type: 'SHOW_OPTIONS', options: type.goalOptions }] };
  }
  if (!ctx.template.selectedTemplateId) {
    const rank = rankFamilies(ctx);
    return {
      text: `${prefix}${type.showcaseLine}${type.id === 'other' ? ':' : ' Estos estilos encajan muy bien con lo que buscas:'}`,
      actions: [{ type: 'RECOMMEND_TEMPLATES', ids: rank.ids, reasons: rank.reasons }]
    };
  }
  if (!ctx.primaryChannel) {
    return {
      text: `${prefix}Última cosa: ¿por dónde quieres que te contacten tus clientes?`,
      actions: [{ type: 'SHOW_OPTIONS', options: channelOptions }]
    };
  }
  if (explicitCreate) {
    return { text: `${prefix}Perfecto. Estoy preparando tu página.`, actions: [{ type: 'CREATE_PAGE' }] };
  }
  return {
    text: `${prefix}Tengo todo lo necesario para tu primera página:`,
    actions: [{ type: 'SHOW_READY' }]
  };
}

export function afterSelection(ctx: BusinessContext, id: TemplateId): AgentResponse {
  const t = getTemplate(id);
  return nextStep(ctx, false, `Buena elección: ${t.name} queda como tu estilo.`);
}

/* ---------- Main interpreter ---------- */

export function runAgent(raw: string, ctx: BusinessContext): AgentResponse {
  const t = normalize(raw);
  const patch = extractContext(raw);
  const hasPatch = Object.keys(patch).length > 0;
  const update: AgentAction[] = hasPatch ? [{ type: 'UPDATE_BUSINESS_CONTEXT', patch }] : [];
  let merged = applyPatch(ctx, patch);
  const wantsCreate = /(creamela|creala|crealo|hazmela|hazla|generala|crea mi pagina ya|crear ya|adelante|dale,? crea|ya,? crea|listo,? crea|vamos con)/.test(t);

  if (!hasPatch) {
    if (/^(hola|buenas|hey|buenos dias|buenas tardes|buenas noches)\b/.test(t) && t.split(/\s+/).length <= 4) {
      return {
        text: 'Hola 👋 ¿Qué quieres crear hoy?',
        actions: merged.businessIdentity.type ? [] : [{ type: 'SHOW_OPTIONS', options: businessOptions }]
      };
    }
    if (/que es cripqer/.test(t)) {
      return {
        text: 'Cripqer crea páginas profesionales para tu negocio. Me cuentas qué haces, eliges un estilo y armo la primera versión en segundos. Después la ajustas a tu gusto.',
        actions: [{ type: 'SHOW_OPTIONS', options: [{ label: 'Quiero crear mi página', message: 'Quiero crear mi página' }, { label: 'Muéstrame un ejemplo', message: 'Muéstrame un ejemplo' }] }]
      };
    }
    if (/que puedo crear/.test(t)) {
      return {
        text: 'Páginas para negocios, servicios y marcas personales: una clínica, un restaurante, un portafolio… Mira lo distintas que pueden ser:',
        actions: [{ type: 'RECOMMEND_TEMPLATES', ids: ['food_story', 'professional_trust', 'visual_portfolio'] }]
      };
    }
    if (/ejemplo/.test(t)) {
      return {
        text: 'Mira esta: una barbería con estilo oscuro y cinematográfico. Te la abro para que la veas completa.',
        actions: [{ type: 'RECOMMEND_TEMPLATES', ids: ['dark_craft'] }, { type: 'PREVIEW_TEMPLATE', id: 'dark_craft' }]
      };
    }
  }

  const ordinal = resolveOrdinal(t, ctx);
  if (ordinal) {
    merged = applySelection(merged, ordinal);
    const res = nextStep(merged, wantsCreate, `Listo, ${getTemplate(ordinal).name} queda seleccionada.`);
    return { text: res.text, actions: [...update, { type: 'SELECT_TEMPLATE', id: ordinal }, ...res.actions] };
  }

  const ref = resolveTemplateReference(t, ctx);
  if (ref) {
    const tpl = getTemplate(ref);
    const fromInitial = ctx.session.initialTemplates.includes(ref) && /(principio|arriba|inicio|al entrar|vi)/.test(t);
    merged = applySelection(merged, ref);
    const lead = fromInitial ?
    `¡Esa es ${tpl.name}, la de ${tpl.demo.toLowerCase()}! La dejé seleccionada.` :
    `Hecho: ${tpl.name} queda seleccionada.`;
    const res = nextStep(merged, wantsCreate, hasPatch && merged.businessIdentity.type ? `Perfecto, ya te entendí. ${lead}` : lead);
    return { text: res.text, actions: [...update, { type: 'SELECT_TEMPLATE', id: ref }, ...res.actions] };
  }

  if (/(principio|al entrar|al inicio|antes)/.test(t) && /(plantilla|estilo|muestra|ver|vi|mostra)/.test(t)) {
    return { text: 'Claro. Aquí están las que viste al entrar.', actions: [...update, { type: 'SHOW_TEMPLATES', scope: 'INITIAL' }] };
  }

  if (/(parecida|similar|otra (opcion|igual|asi)|algo asi|en esa linea|mas como)/.test(t)) {
    const sim = similarTo(merged);
    if (sim) {
      return {
        text: `Aquí van algunas en la línea de ${getTemplate(sim.base).name}:`,
        actions: [...update, { type: 'RECOMMEND_TEMPLATES', ids: sim.ids, similarTo: sim.base }]
      };
    }
  }

  const adjectiveMap: [RegExp, string[]][] = [
  [/elegant|sofistic|lujo|fina/, ['elegante', 'lujo', 'sofisticada']],
  [/modern/, ['moderna', 'segura']],
  [/minimal|simple|limpi|sobri/, ['minimal', 'limpia', 'sobria']],
  [/color|llamativ|atrevid|alegre/, ['colorida', 'llamativa', 'alegre']],
  [/oscur|negr/, ['oscura']],
  [/calid|cercan|human/, ['calida', 'cercana', 'humana']],
  [/seri|profesional|formal/, ['seria', 'profesional']],
  [/clar|blanc|luminos/, ['clara', 'limpia']]];

  if (!patch.type && /(algo|mas|muestra|quiero|otra|otras|ver)/.test(t)) {
    const hit = adjectiveMap.find(([re]) => re.test(t));
    if (hit) {
      const ids = recommendByTags(hit[1]);
      const word = t.match(hit[0])?.[0] ?? '';
      return {
        text: `${hasPatch ? 'Anotado. ' : ''}Estas tienen un carácter más ${word.startsWith('elegant') ? 'elegante' : word.startsWith('oscur') || word.startsWith('negr') ? 'oscuro' : word.startsWith('modern') ? 'moderno' : word.startsWith('minimal') ? 'minimal' : word.startsWith('calid') ? 'cálido' : 'marcado'}:`,
        actions: [...update, { type: 'RECOMMEND_TEMPLATES', ids }]
      };
    }
  }

  if (/(todas las plantillas|catalogo|ver plantillas|todos los estilos|ver estilos|mas plantillas|ver todas)/.test(t)) {
    return { text: 'Te abro todas las plantillas. La conversación sigue aquí mismo.', actions: [...update, { type: 'OPEN_TEMPLATE_DRAWER' }] };
  }

  if (wantsCreate) {
    return { ...nextStep(merged, true), actions: [...update, ...nextStep(merged, true).actions] };
  }

  if (/quiero crear mi pagina|crear una pagina|quiero una pagina/.test(t) && !merged.businessIdentity.type) {
    return {
      text: '¡Vamos! Cuéntame en una frase a qué te dedicas, o elige uno de estos:',
      actions: [...update, { type: 'SHOW_OPTIONS', options: businessOptions }]
    };
  }

  if (/otro tipo de negocio/.test(t)) {
    return { text: 'Perfecto. Cuéntame en una frase qué haces y a quién atiendes.', actions: update };
  }

  if (hasPatch) {
    // A chosen family stays chosen: only its content adapts to the business.
    const selected = ctx.template.selectedTemplateId;
    const newType = patch.type && patch.type !== ctx.businessIdentity.type ? getBusinessType(patch.type) : null;
    const lead =
    selected && newType ?
    `Perfecto. Mantengo ${getTemplate(selected).name} y la adapto a tu ${newType.label.toLowerCase()}.` :
    'Perfecto.';
    const res = nextStep(merged, false, lead);
    return { text: res.text, actions: [...update, ...res.actions] };
  }

  return {
    text: 'Cuéntame un poco más: ¿qué tipo de negocio es y cómo quieres que te contacten?',
    actions: merged.businessIdentity.type ? [] : [{ type: 'SHOW_OPTIONS', options: businessOptions }]
  };
}

/* ---------- Reducer: actions → UI ---------- */

export interface AppliedResponse {
  context: BusinessContext;
  attachment?: Attachment | undefined;
  effects: {openDrawer: boolean;previewId: TemplateId | null;create: boolean;};
}

export function applyAgentResponse(ctx: BusinessContext, res: AgentResponse): AppliedResponse {
  let next = ctx;
  let attachment: Attachment | undefined;
  const effects = { openDrawer: false, previewId: null as TemplateId | null, create: false };
  for (const action of res.actions) {
    switch (action.type) {
      case 'UPDATE_BUSINESS_CONTEXT':
        next = applyPatch(next, action.patch);
        break;
      case 'SELECT_TEMPLATE':
        next = applySelection(next, action.id);
        attachment = { kind: 'selected', id: action.id };
        break;
      case 'RECOMMEND_TEMPLATES':
        attachment = { kind: 'templates', ids: action.ids, scope: action.similarTo ? 'similar' : 'recommended' };
        next = { ...next, session: { ...next.session, lastShownTemplates: action.ids } };
        break;
      case 'SHOW_TEMPLATES':{
          const ids = next.session.initialTemplates;
          attachment = { kind: 'templates', ids, scope: 'initial' };
          next = { ...next, session: { ...next.session, lastShownTemplates: ids } };
          break;
        }
      case 'SHOW_OPTIONS':
        attachment = { kind: 'options', options: action.options };
        break;
      case 'SHOW_READY':
        attachment = { kind: 'ready' };
        break;
      case 'PREVIEW_TEMPLATE':
        effects.previewId = action.id;
        break;
      case 'OPEN_TEMPLATE_DRAWER':
        effects.openDrawer = true;
        break;
      case 'CREATE_PAGE':
        effects.create = true;
        break;
    }
  }
  return { context: next, attachment, effects };
}