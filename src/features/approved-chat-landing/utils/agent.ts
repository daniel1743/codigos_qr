import { templates } from '../data/templates';
import { businessOptions, businessTypes, channelOptions, channels, goals } from '../data/business';
import { getBusinessType, getTemplate, hasPack } from './templates';
import { rankFamilies } from './recommend';
import { buildSalesObjectionResponse, detectSalesObjection } from '../assistant/salesObjections';
import {
  buildCommercialNeedResponse,
  detectCommercialNeed,
  isGalleryAvailabilityQuestion,
  logCommercialNeedRoute,
  GALLERY_AVAILABILITY_TEXT,
} from '../assistant/commercialNeeds';
import type {
  AgentAction,
  AgentResponse,
  Attachment,
  BusinessContext,
  ChatOption,
  ContextPatch,
  ChatMessage,
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
  else if (/\b(soy|somos|me dedico a|trabajo como|tengo un negocio de|tengo una empresa de|para un|para una|mi profesion es|mi profesión es)\s+[a-záéíóúñ]{3,}/.test(t) && !/\b(soy nuevo|soy nueva)\b/.test(t)) patch.type = 'other';
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

const STARTER_OPTIONS: ChatOption[] = [
  { label: 'Quiero crear mi página', message: 'Quiero crear mi página' },
  { label: 'Ver diseños', message: 'Muéstrame diseños' },
  { label: '¿Qué puedo crear?', message: '¿Qué puedo crear?' },
];

const COMMERCIAL_OPTIONS: ChatOption[] = [
  { label: 'Crear mi página', message: 'Quiero crear mi página' },
  { label: 'Ver diseños', message: 'Muéstrame diseños' },
];

const GENERIC_STYLE_IDS: TemplateId[] = ['minimal_premium', 'professional_trust', 'bold_creative'];

function isComparisonIntent(text: string): boolean {
  return /linktree|lintri|beacons|competencia|comparar|diferencia|mejor que/.test(text);
}

function isExampleIntent(text: string): boolean {
  return /ejemplo|diseños?|disenos?|plantillas?|estilos?|ver opciones/.test(text);
}

function isDirectCreateIntent(text: string): boolean {
  return /(quiero crear mi pagina|crear una pagina|quiero una pagina|creamela|creala|crealo|hazmela|hazla|generala|crear ya|adelante|dale,? crea|ya,? crea|listo,? crea|vamos con)/.test(text);
}

function hasSpecificExample(ctx: BusinessContext): boolean {
  const typeId = ctx.businessIdentity.type;
  return Boolean(typeId && hasPack(typeId));
}

function styleRecommendations(ctx: BusinessContext) {
  if (!ctx.businessIdentity.type || !hasSpecificExample(ctx)) {
    return { ids: GENERIC_STYLE_IDS, reasons: {} as Partial<Record<TemplateId, string>> };
  }
  return rankFamilies(ctx);
}

function exampleResponse(ctx: BusinessContext): AgentResponse {
  const type = getBusinessType(ctx.businessIdentity.type);
  const ranking = styleRecommendations(ctx);
  if (type && hasSpecificExample(ctx)) {
    const first = ranking.ids[0];
    return {
      text: `Te muestro diseños que encajan con ${type.label.toLowerCase()}. Son referencias visuales: puedes cambiar el contenido, las imágenes y el estilo en el editor sin necesitar una plantilla exclusiva.`,
      actions: [
        { type: 'RECOMMEND_TEMPLATES', ids: ranking.ids, reasons: ranking.reasons },
        ...(first ? [{ type: 'PREVIEW_TEMPLATE', id: first } as const] : [])
      ]
    };
  }
  return {
    text: type ?
      `No necesitas una plantilla específica para ${type.label.toLowerCase()}. Estas son referencias de estilo —minimalista, profesional y creativo— que puedes adaptar a tu actividad en el editor; no representan otra profesión ni tu identidad final.` :
      'No necesitas encontrar una plantilla exacta para tu profesión. Te muestro referencias de estilo —minimalista, profesional y creativo— para que elijas una base y luego adaptes contenido, imágenes y contacto en el editor.',
    actions: [
      ...(!ctx.businessIdentity.type ? [{ type: 'UPDATE_BUSINESS_CONTEXT', patch: { type: 'other' } } as const] : []),
      { type: 'RECOMMEND_TEMPLATES', ids: ranking.ids, reasons: ranking.reasons }
    ]
  };
}

function optionsForQuestion(text: string): ChatOption[] {
  if (isComparisonIntent(text)) {
    return COMMERCIAL_OPTIONS;
  }
  if (/gratis|precio|costo|cuanto cuesta|importante|redes|instagram|landing|perfil|que hace/.test(text)) {
    return COMMERCIAL_OPTIONS;
  }
  if (isExampleIntent(text)) {
    return [{ label: 'Ver diseños', message: 'Muéstrame diseños' }, { label: 'Crear mi página', message: 'Quiero crear mi página' }];
  }
  return STARTER_OPTIONS;
}

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
  if (explicitCreate && !ctx.template.selectedTemplateId && ctx.primaryGoal !== null) {
    const rank = styleRecommendations(ctx);
    const defaultId = rank.ids[0] ?? GENERIC_STYLE_IDS[0];
    return {
      text: `${prefix}Vamos a preparar tu página con ${getTemplate(defaultId).name} como punto de partida. Podrás cambiar el estilo y personalizar el contenido en el editor antes de publicarla.`,
      actions: [{ type: 'SELECT_TEMPLATE', id: defaultId }, { type: 'CREATE_PAGE' }]
    };
  }
  if (!ctx.template.selectedTemplateId) {
    const rank = styleRecommendations(ctx);
    const intro = hasSpecificExample(ctx) ?
      type.showcaseLine :
      'No necesitas una plantilla exclusiva para tu profesión: estas familias visuales son puntos de partida personalizables';
    return {
      text: `${prefix}${intro}. Estos estilos encajan muy bien con lo que buscas:`,
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

export function runAgent(raw: string, ctx: BusinessContext, history: ChatMessage[] = []): AgentResponse {
  const t = normalize(raw);
  const patch = extractContext(raw);
  const hasPatch = Object.keys(patch).length > 0;
  const update: AgentAction[] = hasPatch ? [{ type: 'UPDATE_BUSINESS_CONTEXT', patch }] : [];
  let merged = applyPatch(ctx, patch);
  const wantsCreate = isDirectCreateIntent(t);
  const objection = detectSalesObjection(t);

  if (objection && !wantsCreate) {
    const response = buildSalesObjectionResponse(objection, merged, history);
    return { text: response.text, actions: [...update, ...response.actions] };
  }

  const commercialNeed = detectCommercialNeed(t);
  if (commercialNeed && !wantsCreate) {
    logCommercialNeedRoute(commercialNeed);
    const response = buildCommercialNeedResponse(commercialNeed, merged);
    const showRelevantDesigns =
      commercialNeed !== "native_booking_limit" && Boolean(merged.businessIdentity.type);
    const designActions = showRelevantDesigns
      ? [{
          type: "RECOMMEND_TEMPLATES" as const,
          ids: styleRecommendations(merged).ids,
          reasons: styleRecommendations(merged).reasons,
        }]
      : [];
    return { text: response.text, actions: [...update, ...response.actions, ...designActions] };
  }

  if (isGalleryAvailabilityQuestion(t)) {
    return {
      text: GALLERY_AVAILABILITY_TEXT,
      actions: [{
        type: 'SHOW_OPTIONS',
        options: [
          { label: 'Ver diseños', message: 'Muéstrame diseños' },
          { label: 'Crear mi página', message: 'Quiero crear mi página' },
        ],
      }],
    };
  }

  if (!hasPatch) {
    if (/^(hola|buenas|hey|buenos dias|buenas tardes|buenas noches)\b/.test(t)) {
      return {
        text: 'Hola 👋 Estoy bien y listo para ayudarte. Cripqer te ayuda a convertir tu perfil en una página clara para reunir enlaces, mostrar lo que haces y facilitar que te contacten. ¿Quieres crear la tuya o prefieres ver un ejemplo?',
        actions: [{ type: 'SHOW_OPTIONS', options: STARTER_OPTIONS }]
      };
    }
    if (/que es cripqer|que hace cripqer/.test(t)) {
      return {
        text: 'Cripqer es una plataforma para crear una página profesional para tu negocio, servicio o marca personal. Reúnes tus enlaces, redes, WhatsApp y contenido en un solo destino, lo personalizas y puedes compartirlo también con un QR; además puedes consultar métricas básicas cuando estén habilitadas. Si quieres una presencia más ordenada y fácil de contactar desde tus redes, Cripqer puede ser una muy buena decisión para empezar.',
        actions: [{ type: 'SHOW_OPTIONS', options: COMMERCIAL_OPTIONS }]
      };
    }
    if (/que puedo crear/.test(t)) {
      return {
        text: 'Puedes crear una página para recibir contactos, mostrar productos o servicios, presentar tu trabajo o facilitar reservas y pedidos. La diferencia es que tu visitante encuentra en un solo lugar qué haces, cómo contactarte y cuál es el siguiente paso; mira algunas formas de empezar:',
        actions: [{ type: 'RECOMMEND_TEMPLATES', ids: ['food_story', 'professional_trust', 'visual_portfolio'] }]
      };
    }
    if (/linktree|lintri/.test(t)) {
      return {
        text: 'Linktree (Lintri) es muy útil para reunir enlaces y destinos desde una bio, y también ofrece herramientas como formularios, productos, reservas e Insights según el plan. Cripqer puede ser una mejor decisión para ti si quieres que ese enlace sea una página de presentación más personalizada, con tu propuesta, contacto, QR editable y métricas básicas; no necesitas abandonar Linktree para probarlo. ¿Quieres crear tu página gratis o ver un ejemplo?',
        actions: [{ type: 'SHOW_OPTIONS', options: COMMERCIAL_OPTIONS }]
      };
    }
    if (/beacons/.test(t)) {
      return {
        text: 'Beacons está muy orientada a creadores: combina link-in-bio con productos digitales, media kit, analítica, herramientas de audiencia y oportunidades de marca. Cripqer puede ser una mejor decisión si tu prioridad es presentar un negocio, servicio o marca personal con una página clara, contacto directo, QR y métricas básicas, aprovechando muchas funciones base gratuitas. ¿Quieres que te muestre cómo quedaría la tuya?',
        actions: [{ type: 'SHOW_OPTIONS', options: COMMERCIAL_OPTIONS }]
      };
    }
    if (/es importante.*(landing|pagina)|landing.*(redes|instagram)|redes.*landing|instagram.*landing|para que.*landing/.test(t)) {
      return {
        text: 'Sí, especialmente si tus redes son tu principal fuente de visitas. Instagram muestra contenido, pero una landing organiza tus enlaces, explica tu oferta y deja un camino claro para escribirte, pedir, reservar o conocer tu trabajo; también puedes compartirla con un QR y revisar el interés básico. Para empezar no necesitas pagar: muchas funciones base y las métricas básicas están disponibles gratis.',
        actions: [{ type: 'SHOW_OPTIONS', options: COMMERCIAL_OPTIONS }]
      };
    }
    if (/es gratis|gratis|precio|cuanto cuesta|costo/.test(t)) {
      return {
        text: 'Sí. El nivel gratuito incluye crear, editar y publicar una página base con contenido, estilo básico, avatar, banner, medios, estructura, bloques y plantillas estándar. Las métricas básicas están disponibles cuando la analítica está habilitada; los precios y funciones avanzadas dependen de la configuración vigente y no voy a inventártelos. ¿Quieres crear tu página y ver qué puedes armar?',
        actions: [{ type: 'SHOW_OPTIONS', options: COMMERCIAL_OPTIONS }]
      };
    }
    if (isExampleIntent(t)) {
      return exampleResponse(ctx);
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

  if (/(algo|mas|muestra|quiero|otra|otras|ver)/.test(t)) {
    const hit = adjectiveMap.find(([re]) => re.test(t));
    if (hit) {
      const ids = patch.type || merged.businessIdentity.type ? styleRecommendations(merged).ids : recommendByTags(hit[1]);
      const word = t.match(hit[0])?.[0] ?? '';
      return {
        text: `${hasPatch ? 'Anotado. ' : ''}Estas opciones tienen un estilo más ${word.startsWith('elegant') ? 'elegante' : word.startsWith('oscur') || word.startsWith('negr') ? 'oscuro' : word.startsWith('modern') ? 'moderno' : word.startsWith('minimal') ? 'minimalista' : word.startsWith('calid') ? 'cálido' : 'marcado'}; son bases visuales que puedes adaptar:`,
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
    // A channel mention inside an informational question (for example,
    // "Tengo Instagram, pero no sé cómo recibir contactos") is not a reason
    // to restart onboarding with business categories. Keep the channel patch,
    // answer the commercial need, and expose the relevant next steps.
    if (!merged.businessIdentity.type && !patch.type && !wantsCreate) {
      const channel = patch.channel ? channels.find((item) => item.id === patch.channel) : null;
      return {
        text: channel ?
          `Perfecto: ${channel.label} puede ser tu puerta de entrada. Cripqer puede ordenar tu propuesta, tus enlaces y el contacto en una sola página para que la persona no tenga que buscar entre tus publicaciones. ¿Quieres crear tu página o ver un ejemplo?` :
          'Entiendo. Antes de elegir un diseño conviene definir qué quieres conseguir: más contactos, ventas, reservas o una presentación más profesional.',
        actions: [...update, { type: 'SHOW_OPTIONS', options: optionsForQuestion(t) }]
      };
    }

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
    text: merged.businessIdentity.type ?
      'Puedo orientarte según tu objetivo: ¿quieres conseguir contactos, vender, recibir reservas o presentar mejor tu trabajo?' :
      'Cuéntame qué quieres conseguir: ¿más contactos, vender productos o servicios, recibir reservas o presentar mejor tu trabajo? Así te recomiendo una página que tenga sentido para ti.',
    actions: merged.businessIdentity.type ? [] : [{ type: 'SHOW_OPTIONS', options: optionsForQuestion(t) }]
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
