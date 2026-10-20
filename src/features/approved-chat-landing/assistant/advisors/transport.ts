import {
  ASSISTANT_TURN_FAILURE_CODES,
  type AssistantTurnFailureCode,
  type AssistantTurnResult,
  type PublicTurnResult } from
'../../../../lib/conversion-advisor/integration/contract';
import type { LandingContextSnapshot } from '../../../../lib/conversion-advisor/integration/landing-context';
import {
  ADVISOR_BROWSER_DEADLINE_MS,
  type ConversionAdvisorAsk,
  type ConversionAdvisorClient } from
'./contract';

/*
 * CONV-02 · the Conversion Advisor's browser transport.
 *
 * It owns exactly two things, and nothing else in the product does:
 *
 *  1. THE CONVERSATION ID. Created lazily, reused for every turn, never
 *     rendered, never stored, never exposed. A failed start is cleared so a
 *     manual retry can begin a fresh conversation instead of being poisoned by
 *     one network error; a `SESSION_UNKNOWN` answer clears it too, because the
 *     server has genuinely forgotten the conversation and reusing the id would
 *     fail forever.
 *  2. THE DEADLINE. A turn that never settles is a spinner the visitor cannot
 *     escape, so the whole operation — session start included — is bounded by
 *     `ADVISOR_BROWSER_DEADLINE_MS` (60 s), which is sized against the advisor's
 *     worst case of ~48.8 s.
 *
 * NO RETRIES. The advisor already owns retry policy on the server, budgeted and
 * bounded. Retrying here would multiply the paid calls behind the guard's back.
 *
 * FAIL CLOSED. The server function answers a closed union; this module rebuilds
 * the success payload field by field from validated primitives. An unexpected
 * shape becomes `UNAVAILABLE`, never a partially-trusted object.
 *
 * The server imports are DYNAMIC and inside the default bindings, so a test (or
 * any host that injects its own) never loads the server boundary, and no route's
 * initial graph does either.
 */

export interface ConversionAdvisorBindings {
  readonly startSession: () => Promise<unknown>;
  readonly askTurn: (input: {
    readonly sessionId: string;
    readonly message: string;
    readonly landingContext: LandingContextSnapshot;
  }) => Promise<unknown>;
}

const SERVER_BINDINGS: ConversionAdvisorBindings = {
  startSession: async () => {
    const { startAdvisorSessionFn } = await import(
      '../../../../lib/conversion-advisor/integration/server'
    );
    return startAdvisorSessionFn();
  },
  askTurn: async (input) => {
    const { askAdvisorAssistantFn } = await import(
      '../../../../lib/conversion-advisor/integration/assistant.server'
    );
    return askAdvisorAssistantFn({ data: input });
  }
};

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODEL_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const TOKEN_PATTERN = /^[A-Z][A-Z0-9_]{0,31}$/;
const CAPABILITY_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

/** Kept local so importing the advisor's runtime modules never enters a bundle. */
const SUGGESTED_ACTIONS: readonly string[] = [
  'EXPLAIN',
  'ASK_ONE_QUESTION',
  'SUGGEST_FEATURE',
  'OFFER_GUEST_EDITOR',
  'OFFER_HELP',
  'NONE'
];
const GROUNDING_STATUSES: readonly string[] = ['GROUNDED', 'FALLBACK'];

const LIMITS = {
  maxReplyChars: 4_000,
  maxIntents: 3,
  maxCapabilities: 3,
  maxLimitations: 3,
  maxTokens: 10_000
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= LIMITS.maxTokens ?
  value :
  null;
}

function stringList(
value: unknown,
max: number,
pattern: RegExp)
: string[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !pattern.test(item)) return null;
    out.push(item);
  }
  return out;
}

/** The uuid-only session handle the server returns when it opens a conversation. */
function parseSessionId(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const id = value['session_id'];
  return typeof id === 'string' && SESSION_ID_PATTERN.test(id) ? id : null;
}

/**
 * Rebuilds the wire answer. Total and closed: anything not recognised becomes
 * `null`, which the caller reports as `UNAVAILABLE`.
 */
export function parseAssistantTurnResult(value: unknown): AssistantTurnResult | null {
  if (!isRecord(value)) return null;

  if (value['ok'] === false) {
    const code = value['code'];
    if (typeof code !== 'string' || !(ASSISTANT_TURN_FAILURE_CODES as readonly string[]).includes(code)) {
      return null;
    }
    const message = typeof value['message'] === 'string' ? value['message'].slice(0, 300) : '';
    return { ok: false, code: code as AssistantTurnFailureCode, message };
  }

  if (value['ok'] !== true) return null;
  const data = value['data'];
  if (!isRecord(data)) return null;

  const sessionId = data['session_id'];
  const model = data['model'];
  const reply = data['reply'];
  const suggested = data['suggested_action'];
  const grounding = data['grounding_status'];
  const degraded = data['degraded'];
  const turnsUsed = boundedInt(data['turns_used']);
  const turnsRemaining = boundedInt(data['turns_remaining']);
  const intents = stringList(data['detected_intents'], LIMITS.maxIntents, TOKEN_PATTERN);
  const capabilities = stringList(
    data['relevant_capability_ids'],
    LIMITS.maxCapabilities,
    CAPABILITY_PATTERN
  );
  const limitations = stringList(data['limitations'], LIMITS.maxLimitations, /^[\s\S]{1,160}$/);

  if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) return null;
  if (model !== null && (typeof model !== 'string' || !MODEL_PATTERN.test(model))) return null;
  if (typeof reply !== 'string') return null;
  const text = reply.trim();
  if (text === '' || text.length > LIMITS.maxReplyChars) return null;
  if (typeof suggested !== 'string' || !SUGGESTED_ACTIONS.includes(suggested)) return null;
  if (typeof grounding !== 'string' || !GROUNDING_STATUSES.includes(grounding)) return null;
  if (typeof degraded !== 'boolean') return null;
  if (turnsUsed === null || turnsRemaining === null) return null;
  if (intents === null || capabilities === null || limitations === null) return null;

  const payload: PublicTurnResult = {
    session_id: sessionId,
    model,
    reply: text,
    detected_intents: intents as PublicTurnResult['detected_intents'],
    relevant_capability_ids: capabilities,
    suggested_action: suggested as PublicTurnResult['suggested_action'],
    limitations,
    grounding_status: grounding as PublicTurnResult['grounding_status'],
    degraded,
    turns_used: turnsUsed,
    turns_remaining: turnsRemaining
  };

  return { ok: true, data: payload };
}

/** Rejects when `promise` does not settle in time. Never leaves a live timer. */
function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('advisor turn timed out'));
    }, ms);
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export interface ConversionAdvisorClientOptions {
  /** A turn's deadline. The default is the product's 60 s; a test uses a short one. */
  readonly timeoutMs?: number;
}

export function createConversionAdvisorClient(
  bindings: ConversionAdvisorBindings = SERVER_BINDINGS,
  options: ConversionAdvisorClientOptions = {},
): ConversionAdvisorClient {
  const timeoutMs = options.timeoutMs ?? ADVISOR_BROWSER_DEADLINE_MS;

  /**
   * One promise, created by the first turn and reused by every later one, so a
   * rapid pair of submits cannot open two conversations. Cleared on failure.
   */
  let session: Promise<string> | null = null;

  function sessionId(): Promise<string> {
    if (session !== null) return session;
    session = bindings.
    startSession().
    then(
      (handle) => {
        const id = parseSessionId(handle);
        if (id === null) throw new Error('advisor session malformed');
        return id;
      },
      (error: unknown) => {
        session = null;
        throw error;
      }
    ).
    catch((error: unknown) => {
      session = null;
      throw error;
    });
    return session;
  }

  return {
    ask: async function (input: ConversionAdvisorAsk): Promise<AssistantTurnResult> {
      const run = (async () => {
        const id = await sessionId();
        const raw = await bindings.askTurn({
          sessionId: id,
          message: input.message,
          landingContext: input.landingContext
        });
        const parsed = parseAssistantTurnResult(raw);
        if (parsed === null) {
          // A shape we do not recognise is a failure, never something to trust
          // partially. No exception: the facade gets a normal safe response.
          return { ok: false as const, code: 'UNAVAILABLE' as const, message: '' };
        }
        if (!parsed.ok && parsed.code === 'SESSION_UNKNOWN') session = null;
        return parsed;
      })();

      return withDeadline(run, timeoutMs);
    }
  };
}
