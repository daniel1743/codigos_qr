/**
 * CRIPQER Conversion Advisor — CA-4 · response contract and validation.
 *
 * CA4_5 is explicit that trusting the prompt is not a control: "no confiar
 * solamente en que el modelo obedecerá el prompt". So the model's answer is
 * parsed strictly and then judged DETERMINISTICALLY against the closed set the
 * strategy engine handed it, before any of it can reach a visitor.
 *
 * Honest limit: keyword screening catches money, discounts, roadmap and
 * absolute promises, but it cannot prove that a sentence is faithful to the
 * catalog. The mitigation is structural — the model may only reference
 * capability ids from the closed set, and it is given the catalog's own
 * limitation texts to reuse rather than to invent.
 */

import { screenClaim } from "../capabilities/catalog";
import { AdvisorProviderError } from "../provider.server";
import { type IntentId, type NextBestAction, type VisitorSignals } from "../intents/contract";

/**
 * GROUNDED: the reply passed every deterministic check and is shown.
 * FALLBACK: it did not (or the provider failed) and the safe reply is shown
 * instead. There is deliberately no middle state — an unverified commercial
 * sentence is not shown at all.
 */
export type GroundingStatus = "GROUNDED" | "FALLBACK";

export interface AdvisorResponse {
  readonly reply: string;
  readonly detected_intents: readonly IntentId[];
  readonly relevant_capability_ids: readonly string[];
  readonly suggested_action: NextBestAction;
  readonly confidence: number;
  readonly limitations: readonly string[];
  readonly grounding_status: GroundingStatus;
}

export interface ModelAnswer {
  readonly reply: string;
  readonly capability_ids: readonly string[];
  readonly limitations: readonly string[];
}

export const ANSWER_LIMITS = {
  /**
   * CA-9C — 900 → 1 000, from the CA-9B recorded bodies.
   *
   * The largest complete, schema-valid advice reply in that run was 906
   * characters (record 124: 508 completion tokens, every field in bounds, no
   * truncation). It was rejected for being 6 characters over a round number and
   * the visitor got the fallback instead of a good answer. The 6 characters were
   * a closing question (a 62-character sentence), which is also the sentence the
   * usefulness rubric rewards — so trimming at the previous sentence boundary
   * would have been the lossy fix, not the safe one.
   *
   * 1 000 is the old target plus a 100-character allowance: enough for one short
   * closing sentence, still a hard ceiling. A grossly oversized reply (anything
   * over 1 000) fails closed exactly as before, and the concision guard is
   * unchanged — `evaluation/scorer.ts` copies this number and a test pins the
   * copy, so the rubric and the parser move together.
   */
  maxReplyChars: 1_000,
  minReplyChars: 12,
  maxCapabilityIds: 3,
  maxLimitations: 3,
  maxLimitationChars: 200,
} as const;

function fail(detail: string): never {
  throw new AdvisorProviderError("SCHEMA_INVALID", { detail });
}

const trimOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

/** Strict parse of the reply JSON. Unknown keys are rejected, not ignored. */
export function parseModelAnswer(text: string): ModelAnswer {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail("answer is not valid JSON");
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw))
    fail("answer is not an object");

  const record = raw as Record<string, unknown>;
  const allowed = new Set(["reply", "capability_ids", "limitations"]);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) fail(`unexpected key: ${key}`);
  }

  const reply = trimOrNull(record["reply"]);
  if (reply === null) fail("reply is empty");
  if (reply.length < ANSWER_LIMITS.minReplyChars) fail("reply is too short to be an answer");
  if (reply.length > ANSWER_LIMITS.maxReplyChars) fail("reply is too long");

  const capabilityIds = record["capability_ids"];
  if (!Array.isArray(capabilityIds)) fail("capability_ids must be an array");
  if (capabilityIds.length > ANSWER_LIMITS.maxCapabilityIds) fail("too many capability_ids");
  const ids: string[] = [];
  for (const id of capabilityIds) {
    if (typeof id !== "string" || id.trim() === "") fail("capability_ids contains an invalid id");
    ids.push(id.trim());
  }

  const limitationsRaw = record["limitations"];
  if (!Array.isArray(limitationsRaw)) fail("limitations must be an array");
  if (limitationsRaw.length > ANSWER_LIMITS.maxLimitations) fail("too many limitations");
  const limitations: string[] = [];
  for (const item of limitationsRaw) {
    const text2 = trimOrNull(item);
    if (text2 === null) fail("limitations contains an empty item");
    if (text2.length > ANSWER_LIMITS.maxLimitationChars) fail("a limitation is too long");
    limitations.push(text2);
  }

  return { reply, capability_ids: ids, limitations };
}

/** Text-level screens: no commercial overreach, no links, no markup. */
export const REPLY_FORBIDDEN_PATTERNS: readonly {
  readonly what: string;
  readonly pattern: RegExp;
}[] = [
  { what: "markup", pattern: /<\s*\/?\s*[a-z][^>]*>/i },
  { what: "link", pattern: /https?:\/\/|www\./i },
  { what: "markdown_link", pattern: /\[[^\]]+\]\([^)]+\)/ },
];

export interface ScreenResult {
  readonly safe: boolean;
  readonly matched: readonly string[];
}

export function screenReplyText(text: string): ScreenResult {
  const matched: string[] = [];
  const claim = screenClaim(text);
  if (!claim.safe) matched.push(...claim.matched);
  for (const rule of REPLY_FORBIDDEN_PATTERNS) {
    const found = rule.pattern.exec(text);
    if (found) matched.push(`${rule.what}:${found[0].slice(0, 24)}`);
  }
  return { safe: matched.length === 0, matched };
}

export interface ValidationContext {
  /** The closed set the strategy engine authorised for this turn. */
  readonly allowedCapabilityIds: readonly string[];
  readonly knownCapabilityIds: readonly string[];
}

export interface ValidationVerdict {
  readonly ok: boolean;
  readonly problems: readonly string[];
}

/** Deterministic, side-effect free. Rejects rather than repairs. */
export function validateAnswer(answer: ModelAnswer, context: ValidationContext): ValidationVerdict {
  const problems: string[] = [];

  const screen = screenReplyText(answer.reply);
  if (!screen.safe) problems.push(`reply_claim:${screen.matched.join("|")}`);

  for (const id of answer.capability_ids) {
    if (!context.knownCapabilityIds.includes(id)) problems.push(`unknown_capability:${id}`);
    else if (!context.allowedCapabilityIds.includes(id))
      problems.push(`capability_not_authorised:${id}`);
  }

  for (const limitation of answer.limitations) {
    if (!screenReplyText(limitation).safe)
      problems.push(`limitation_claim:${limitation.slice(0, 40)}`);
  }

  return { ok: problems.length === 0, problems };
}

/**
 * What the visitor sees when the model cannot be trusted. It states the
 * limitation, offers a retry and promises nothing — the only reply that is
 * always true.
 */
export const SAFE_FAILURE_REPLY =
  "No quiero darte información que no pueda respaldar, así que prefiero no responder eso ahora mismo. " +
  "Puedo intentarlo otra vez, o contarte solo lo que está verificado de CRIPQER. ¿Qué prefieres?";

export function fallbackResponse(
  signals: VisitorSignals,
  reason: string,
  action: NextBestAction = "NONE",
): AdvisorResponse {
  return {
    reply: SAFE_FAILURE_REPLY,
    detected_intents: signals.intents,
    relevant_capability_ids: [],
    suggested_action: action,
    confidence: 0,
    limitations: [`respuesta_no_emitida:${reason}`],
    grounding_status: "FALLBACK",
  };
}
