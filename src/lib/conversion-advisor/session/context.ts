/**
 * CRIPQER Conversion Advisor — CA-6 · conversational context.
 *
 * What the advisor is allowed to remember between turns, and what it must
 * forget. Pure functions only: no clock, no storage, no I/O — the lifecycle
 * lives in `store.server.ts`.
 *
 * TWO DELIBERATE OMISSIONS, both on purpose:
 *   · OBJECTIONS are never carried between turns. A visitor who said "no quiero
 *     registrarme" and then said "bueno, quiero probar" must not be followed
 *     around by the old objection. CA-3 extracts them per turn, for that turn.
 *   · VERBATIM QUESTIONS are not stored either: what is kept is which TOPICS
 *     were already addressed, so the advisor does not repeat itself without
 *     hoarding what the person literally typed.
 */

import { type ListeningTurn } from "../intents/classifier.server";
import { type IntentId, type VisitorSignals } from "../intents/contract";

export const SESSION_LIMITS = {
  /** Since the last message. */
  inactivityTimeoutMs: 30 * 60_000,
  /** Since the session was created, no matter how active it is. */
  absoluteTimeoutMs: 2 * 60 * 60_000,
  maxTurnsTotal: 50,
  /** Turns handed to CA-3 as context. */
  maxRecentTurns: 6,
  maxNeeds: 4,
  maxTools: 5,
  maxTopics: 6,
  maxTextChars: 160,
} as const;

export interface SessionContext {
  /** Explicitly stated business type. A later statement REPLACES it. */
  readonly business_type: string | null;
  readonly primary_goal: string | null;
  readonly secondary_goals: readonly string[];
  readonly expressed_needs: readonly string[];
  readonly current_tools: readonly string[];
  readonly last_intent: IntentId | null;
  /** Topics already answered, so the advisor does not repeat itself. */
  readonly addressed_topics: readonly IntentId[];
  readonly recent_turns: readonly ListeningTurn[];
  readonly turns_total: number;
}

export function emptyContext(): SessionContext {
  return {
    business_type: null,
    primary_goal: null,
    secondary_goals: [],
    expressed_needs: [],
    current_tools: [],
    last_intent: null,
    addressed_topics: [],
    recent_turns: [],
    turns_total: 0,
  };
}

/* ============================== scrubbing =============================== */

export const REDACTION = "[dato omitido]";
const INSTRUCTION_REDACTION = "[instrucción omitida]";

/**
 * Instruction-shaped phrases are neutralised at STORAGE time. The stored turns
 * are replayed to the model on every later request, so a malicious instruction
 * typed in turn 2 would otherwise ride along for the rest of the conversation.
 */
const INSTRUCTION_PATTERNS: readonly RegExp[] = [
  /\b(ignora|olvida|desestima|descarta)\s+(tus|las|los|mis)\s+(instrucciones|reglas|indicaciones|órdenes|ordenes)/gi,
  /\b(dame|muestra|revela|enséñame|ensename|imprime)\s+(el\s+|tu\s+)?(prompt|system\s*prompt|token|api[_\s-]?key|clave|contraseña|password|secreto)/gi,
  /\b(activa|habilita|ejecuta)\s+(la\s+)?(generación|generacion|creación|creacion)\s+(automática|automatica)/gi,
  /\b(nuevo\s+rol|nueva\s+personalidad|modo\s+desarrollador|jailbreak|dan\s+mode)\b/gi,
  /^\s*(system|assistant|developer)\s*:/gim,
  /\b(eres|ahora\s+eres)\s+(un|una)\s+(asistente|modelo|ia)\s+sin\s+(reglas|restricciones)/gi,
];

/** Personal data and secrets must not survive into the stored context. */
const SENSITIVE_PATTERNS: readonly RegExp[] = [
  /[\w.+-]+@[\w-]+\.[\w.]{2,}/g, // email
  /\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b/g, // RUT/DNI-like
  /\b\d{13,19}\b/g, // card-like long digit runs
  /\+?\d[\d\s().-]{7,}\d/g, // phone-like
  /\b(sk-|pk-|api[_-]?key|bearer|authorization|password|contraseña|token)\b\s*[:=]?\s*\S*/gi, // secrets
  /https?:\/\/\S+/gi, // links (and anything a link might carry)
];

export function scrubText(raw: string): string {
  let text = raw;
  for (const pattern of INSTRUCTION_PATTERNS) text = text.replace(pattern, INSTRUCTION_REDACTION);
  for (const pattern of SENSITIVE_PATTERNS) text = text.replace(pattern, REDACTION);
  text = text.replace(/\s{2,}/g, " ").trim();
  return text.length > SESSION_LIMITS.maxTextChars
    ? text.slice(0, SESSION_LIMITS.maxTextChars)
    : text;
}

export function scrubTurn(turn: ListeningTurn): ListeningTurn {
  return { role: turn.role, content: scrubText(turn.content) };
}

/* ================================ merge ================================= */

function unionBounded(
  existing: readonly string[],
  incoming: readonly string[],
  max: number,
): readonly string[] {
  const merged: string[] = [...existing];
  for (const value of incoming) {
    const clean = scrubText(value);
    if (clean === "" || clean === REDACTION) continue;
    if (!merged.includes(clean)) merged.push(clean);
  }
  return merged.slice(-max);
}

function unionTopics(
  existing: readonly IntentId[],
  incoming: readonly IntentId[],
  max: number,
): readonly IntentId[] {
  const merged = [...existing];
  for (const intent of incoming) if (!merged.includes(intent)) merged.push(intent);
  return merged.slice(-max);
}

export interface MergeInput {
  readonly userMessage: string;
  readonly assistantMessage?: string | null;
  readonly signals: VisitorSignals;
}

/**
 * Applies one turn onto the context.
 *
 * A NEW explicit statement replaces the old one (that is what "una corrección
 * explícita reemplaza información anterior" means in practice: the newest
 * explicit value wins). Lists accumulate, deduplicated and bounded. Nothing is
 * ever inferred: absent signals leave the previous value untouched.
 */
export function mergeTurn(context: SessionContext, input: MergeInput): SessionContext {
  const { signals } = input;
  const turns: ListeningTurn[] = [
    ...context.recent_turns,
    { role: "user" as const, content: input.userMessage },
  ];
  if (input.assistantMessage)
    turns.push({ role: "assistant" as const, content: input.assistantMessage });

  return {
    business_type: signals.business_type ?? context.business_type,
    primary_goal: signals.primary_goal ?? context.primary_goal,
    secondary_goals: unionBounded(context.secondary_goals, signals.secondary_goals, 3),
    expressed_needs: unionBounded(
      context.expressed_needs,
      signals.expressed_needs,
      SESSION_LIMITS.maxNeeds,
    ),
    current_tools: unionBounded(
      context.current_tools,
      signals.current_tools,
      SESSION_LIMITS.maxTools,
    ),
    last_intent: signals.intents[0] ?? context.last_intent,
    addressed_topics: unionTopics(
      context.addressed_topics,
      signals.intents,
      SESSION_LIMITS.maxTopics,
    ),
    recent_turns: turns.map(scrubTurn).slice(-SESSION_LIMITS.maxRecentTurns),
    turns_total: context.turns_total + 1,
  };
}

/** The context CA-3 receives, derived from what we stored — never more. */
export function toListeningContext(context: SessionContext, currentMessage: string) {
  return {
    currentMessage,
    previousTurns: context.recent_turns,
    knownFacts: { business_type: context.business_type, primary_goal: context.primary_goal },
  };
}
