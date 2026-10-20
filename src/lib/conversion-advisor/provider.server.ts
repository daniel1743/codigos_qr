/**
 * CRIPQER Conversion Advisor — CA-1 · DeepSeek provider adapter.
 *
 * SERVER-ONLY. The API key never leaves this module and is never logged,
 * echoed in an error, or returned in a result.
 *
 * Deliberate design decisions (each one is a rule from the CA spec):
 *
 *  · The provider is called with `fetch`, not a vendor SDK, so that timeout,
 *    abort, status classification and retry are all explicit and testable.
 *  · `fallback` (OneProvider) is DISABLED BY DEFAULT. The landing bot always
 *    falls through to it; the advisor must not, unless an operator turns it on.
 *  · Permanent failures (401, 402/403, 400) are NEVER retried.
 *  · A valid JSON body is not a valid answer: `intent_classifier` responses are
 *    validated against a closed schema AFTER parsing (enums, lengths, unknown
 *    keys), because "JSON válido no garantiza estructura semántica correcta".
 *  · Errors are typed and carry no provider payload, no headers and no key.
 */

/* ============================== errors ================================== */

export const ADVISOR_ERROR_CODES = [
  "MISCONFIGURED",
  "UNAUTHORIZED",
  "PAYMENT_REQUIRED",
  "INVALID_REQUEST",
  "RATE_LIMITED",
  "TIMEOUT",
  "ABORTED",
  "PROVIDER_UNAVAILABLE",
  "NETWORK",
  "INVALID_RESPONSE",
  "SCHEMA_INVALID",
] as const;

export type AdvisorErrorCode = (typeof ADVISOR_ERROR_CODES)[number];

/** Identity sentinel for the per-attempt timeout (never thrown to callers). */
const TIMEOUT_SENTINEL = new Error("advisor-timeout");

/** Codes that a bounded retry may legitimately help with. */
const RETRYABLE: ReadonlySet<AdvisorErrorCode> = new Set<AdvisorErrorCode>([
  "RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "NETWORK",
  "TIMEOUT",
]);

export class AdvisorProviderError extends Error {
  readonly code: AdvisorErrorCode;
  readonly retryable: boolean;
  readonly status: number | null;
  /** Safe, non-secret detail: a reason name or a schema path. Never a payload. */
  readonly detail: string | null;

  constructor(
    code: AdvisorErrorCode,
    options: { status?: number | null; detail?: string | null; cause?: unknown } = {},
  ) {
    super(`Advisor provider error: ${code}`);
    this.name = "AdvisorProviderError";
    this.code = code;
    this.retryable = RETRYABLE.has(code);
    this.status = options.status ?? null;
    this.detail = options.detail ?? null;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

/* ============================== config ================================== */

export interface AdvisorProviderConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly maxOutputTokens: number;
  /** Retries AFTER the first attempt. 0 = single attempt. */
  readonly maxRetries: number;
  readonly retryBaseDelayMs: number;
}

export interface AdvisorEnv {
  DEEPSEEK_API_KEY?: string | undefined;
  DEEPSEEK_BASE_URL?: string | undefined;
  DEEPSEEK_MODEL?: string | undefined;
  /**
   * CONV-02 — the advisor's OWN model variable.
   *
   * `DEEPSEEK_MODEL` is shared with the fuxion, landing-bot and support
   * assistants. Pointing it at the advisor's model would silently change those
   * three consumers. This variable wins over it, so the advisor can be pinned
   * without touching any other subsystem. Precedence:
   * `ADVISOR_MODEL` → `DEEPSEEK_MODEL` → `deepseek-flash`.
   */
  ADVISOR_MODEL?: string | undefined;
  ADVISOR_TIMEOUT_MS?: string | undefined;
  ADVISOR_MAX_OUTPUT_TOKENS?: string | undefined;
  ADVISOR_MAX_RETRIES?: string | undefined;
}

export const ADVISOR_DEFAULTS = {
  baseUrl: "https://api.deepseek.com",
  /**
   * CA-9A.2 — the approved model.
   *
   * CA-9A.1 found the mismatch: the repository shipped `deepseek-chat`, which is
   * not in the provider's published model or price list. The owner decided
   * `deepseek-flash`, and this default follows it. The id is still CONFIGURATION
   * (`DEEPSEEK_MODEL` overrides it), but the DEFAULT is now the approved model,
   * and `evaluation/pricing.ts` is where its price lives. A model this build has
   * no verified price for cannot be priced by the campaign guard.
   */
  model: "deepseek-flash",
  /**
   * CONV-02 — the owner decision for the public landing.
   *
   * A normal turn makes TWO operations (understanding + advice), each with
   * `1 + maxRetries = 2` attempts: 2 × 2 × 12 s + 0.4 s backoff ≈ 48.8 s. The
   * browser deadline is 60 s, leaving ~11.2 s of margin. The previous 20 s made
   * the worst case ~80.8 s, which the 30 s landing transport could never
   * accommodate: the browser abandoned turns the server was still paying for.
   */
  timeoutMs: 12_000,
  /**
   * CA-9C — DERIVED from the CA-9B recorded bodies, not chosen.
   *
   * Evidence. The CA-9B run used 800 and 9 of its 168 completions landed exactly
   * on that cap, across 8 turns: 6 stopped mid-JSON and 3 returned 800 completion
   * tokens with EMPTY content — the model spent the whole budget before it
   * emitted a single visible character. The largest healthy structured answer in
   * that run was 1 229 JSON characters (787 completion tokens), so 800 was never
   * far above the normal case and sat exactly on the failure mode.
   *
   * The ceiling this build can actually ask for. One advice completion is
   * `{reply, capability_ids, limitations}`. With `ANSWER_LIMITS` (1 000-character
   * reply, 3 limitations of 200, 3 ids of up to 22) plus the JSON punctuation and
   * key names, the largest legal completion is 1 720 characters (measured:
   * `JSON.stringify` of that exact payload).
   *
   * The worst measured density in that run was 0.6611 characters per completion
   * token — 1.5127 tokens per character (record 18: 513 characters in 776
   * tokens). A ceiling-sized answer therefore needs ceil(1720 × 1.5127) =
   * 2 602 tokens.
   *
   * The burned-budget allowance. Records 61, 82 and 149 prove a completion can
   * consume the ENTIRE budget and emit nothing — so a run may arrive at the
   * answer with the old 800 already spent. 2 602 + 800 = 3 402, rounded up to the
   * next multiple of 256: 3 584.
   *
   * This is 4.48× the old value and BUDGET-VISIBLE: the campaign guard prices
   * `maxOutputTokens × PROVIDER_OPERATIONS_PER_TURN` into `requestUpperBoundUsd`
   * (see `evaluation/budget-profile.ts`), which raises the per-turn ceiling from
   * USD 0.003120 to 0.0098016 — 0.8233 USD over the CA-9B campaign's 84 turns
   * (168 provider operations), still far below the approved 5.00 USD hard cap. The CEILING rises; the BILL does not,
   * because output tokens are charged only when they are generated. Whether the
   * provider accepts a 3 584-token request is not asserted here — no call was
   * made in this phase — and CA-9D is where a real run must confirm it.
   */
  maxOutputTokens: 3_584,
  maxRetries: 1,
  retryBaseDelayMs: 400,
} as const;

function positiveInt(raw: string | undefined, fallback: number, max: number): number {
  const n = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

/**
 * Reads and validates configuration. Returns `null` when the provider is not
 * configured — the caller decides whether that is a hard failure; the advisor
 * fails closed (no key ⇒ no model call), it never guesses a credential.
 */
export function readAdvisorProviderConfig(env: AdvisorEnv): AdvisorProviderConfig | null {
  const apiKey = (env.DEEPSEEK_API_KEY ?? "").trim();
  if (apiKey === "") return null;

  const baseUrl = (env.DEEPSEEK_BASE_URL ?? "").trim() || ADVISOR_DEFAULTS.baseUrl;
  if (!/^https:\/\//i.test(baseUrl)) {
    throw new AdvisorProviderError("MISCONFIGURED", { detail: "baseUrl must be https" });
  }

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    model:
      (env.ADVISOR_MODEL ?? "").trim() ||
      (env.DEEPSEEK_MODEL ?? "").trim() ||
      ADVISOR_DEFAULTS.model,
    timeoutMs: positiveInt(env.ADVISOR_TIMEOUT_MS, ADVISOR_DEFAULTS.timeoutMs, 120_000),
    maxOutputTokens: positiveInt(
      env.ADVISOR_MAX_OUTPUT_TOKENS,
      ADVISOR_DEFAULTS.maxOutputTokens,
      8_000,
    ),
    maxRetries: Math.min(
      Number.parseInt(String(env.ADVISOR_MAX_RETRIES ?? ""), 10) || ADVISOR_DEFAULTS.maxRetries,
      3,
    ),
    retryBaseDelayMs: ADVISOR_DEFAULTS.retryBaseDelayMs,
  };
}

/* ============================== request ================================= */

export type AdvisorMode = "intent_classifier" | "advisor";

export interface AdvisorChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export interface AdvisorRequest {
  readonly mode: AdvisorMode;
  readonly systemPrompt: string;
  readonly messages: readonly AdvisorChatMessage[];
  readonly maxOutputTokens?: number;
  /**
   * CA-3 extension (backwards compatible): the validator applied to a
   * `intent_classifier` completion. Defaults to `parseIntentJson` below, so
   * every existing caller and test keeps its behaviour; a richer consumer (the
   * CA-3 listening contract) injects its own strict schema instead.
   */
  readonly parse?: (text: string) => unknown;
  /**
   * CA-4 extension (backwards compatible): ask the provider for a JSON object
   * in `advisor` mode too. Defaults to the previous behaviour, where only
   * `intent_classifier` requests JSON.
   */
  readonly jsonOutput?: boolean;
}

export interface AdvisorResult {
  readonly text: string;
  readonly parsed: unknown | null;
  readonly usage: { readonly inputTokens: number; readonly outputTokens: number };
  readonly model: string;
  readonly latencyMs: number;
  readonly attempts: number;
}

export interface AdvisorDeps {
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
}

/** Hard input bounds — enforced before any network call. */
export const ADVISOR_LIMITS = {
  maxMessages: 12,
  maxSystemPromptChars: 8_000,
  maxMessageChars: 2_000,
} as const;

function assertRequestWithinLimits(request: AdvisorRequest): void {
  if (request.systemPrompt.length > ADVISOR_LIMITS.maxSystemPromptChars) {
    throw new AdvisorProviderError("INVALID_REQUEST", { detail: "systemPrompt too long" });
  }
  if (request.messages.length === 0 || request.messages.length > ADVISOR_LIMITS.maxMessages) {
    throw new AdvisorProviderError("INVALID_REQUEST", { detail: "message count out of range" });
  }
  for (const message of request.messages) {
    if (message.content.length > ADVISOR_LIMITS.maxMessageChars) {
      throw new AdvisorProviderError("INVALID_REQUEST", { detail: "message too long" });
    }
  }
}

function classifyStatus(status: number): AdvisorErrorCode | null {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 402 || status === 403) return "PAYMENT_REQUIRED";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_UNAVAILABLE";
  if (status >= 400) return "INVALID_REQUEST";
  return null;
}

function readUsage(body: unknown): { inputTokens: number; outputTokens: number } {
  const usage = (body as { usage?: Record<string, unknown> } | null)?.usage ?? {};
  const asNumber = (value: unknown): number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
  return {
    inputTokens: asNumber(usage["prompt_tokens"] ?? usage["input_tokens"]),
    outputTokens: asNumber(usage["completion_tokens"] ?? usage["output_tokens"]),
  };
}

/* ============================== call ==================================== */

/**
 * One bounded call to the provider, with retries limited to retryable codes.
 * Throws `AdvisorProviderError` on every failure path; never throws anything
 * else, so callers can rely on the code.
 */
export async function completeAdvisorChat(
  request: AdvisorRequest,
  config: AdvisorProviderConfig,
  deps: AdvisorDeps = {},
): Promise<AdvisorResult> {
  assertRequestWithinLimits(request);

  const doFetch = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => Date.now());
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  const body = JSON.stringify({
    model: config.model,
    messages: [
      { role: "system", content: request.systemPrompt },
      ...request.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    max_tokens: request.maxOutputTokens ?? config.maxOutputTokens,
    temperature: request.mode === "intent_classifier" ? 0 : undefined,
    ...(request.mode === "intent_classifier" || request.jsonOutput === true
      ? { response_format: { type: "json_object" } }
      : {}),
  });

  const startedAt = now();
  let attempts = 0;
  let lastError: AdvisorProviderError | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    attempts += 1;
    const controller = new AbortController();
    // A sentinel reason (compared by identity below) so a timeout is NOT
    // mistaken for a caller-initiated abort: `abort(reason)` makes fetch reject
    // with the reason itself, which carries no `AbortError` name.
    const timer = setTimeout(() => controller.abort(TIMEOUT_SENTINEL), config.timeoutMs);

    try {
      const response = await doFetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.apiKey}`,
        },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const code = classifyStatus(response.status) ?? "PROVIDER_UNAVAILABLE";
        throw new AdvisorProviderError(code, { status: response.status });
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new AdvisorProviderError("INVALID_RESPONSE", { detail: "body is not JSON" });
      }

      const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> } | null)
        ?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim() === "") {
        throw new AdvisorProviderError("INVALID_RESPONSE", { detail: "empty completion" });
      }

      const text = content.trim();
      // A supplied validator applies in any mode (CA-4 asks the advisor for JSON
      // as well). Without one, only classifier mode parses — unchanged.
      const parsed = request.parse
        ? request.parse(text)
        : request.mode === "intent_classifier"
          ? parseIntentJson(text)
          : null;

      return {
        text,
        parsed,
        usage: readUsage(payload),
        model: config.model,
        latencyMs: now() - startedAt,
        attempts,
      };
    } catch (error) {
      const timedOut =
        error === TIMEOUT_SENTINEL || (error as { reason?: unknown })?.reason === TIMEOUT_SENTINEL;
      const aborted = error instanceof Error && error.name === "AbortError";
      const normalized =
        error instanceof AdvisorProviderError
          ? error
          : timedOut
            ? new AdvisorProviderError("TIMEOUT", { detail: "provider did not answer in time" })
            : aborted
              ? new AdvisorProviderError("ABORTED", { detail: "call aborted" })
              : new AdvisorProviderError("NETWORK", { detail: "transport failure", cause: error });

      lastError = normalized;
      const exhausted = attempt >= config.maxRetries;
      if (!normalized.retryable || exhausted) throw normalized;

      // Exponential backoff, bounded. No jitter: the retry budget is tiny (≤1).
      await sleep(config.retryBaseDelayMs * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new AdvisorProviderError("PROVIDER_UNAVAILABLE");
}

/* ==================== strict intent-response validation ================= */

/**
 * The closed schema the model must satisfy in `intent_classifier` mode.
 * Validation happens AFTER JSON.parse: a syntactically valid object with the
 * wrong enum, an over-long field or an unexpected key is a failure, not a
 * "close enough" answer.
 */
export const ADVISOR_INTENT_IDS = [
  "DISCOVERY",
  "BUSINESS_NEED",
  "FEATURE_QUESTION",
  "COMPARISON",
  "PRICING",
  "OBJECTION",
  "START_CREATION",
  "EDITOR_HELP",
  "PREMIUM_INTEREST",
  "TECHNICAL_SUPPORT",
  "OTHER",
] as const;

/**
 * Canonical readiness vocabulary, shared by every consumer. CA-1 first shipped
 * `COLD|WARM|READY`; the CA-3 listening contract fixed the vocabulary to the
 * four values below and CA-1 was aligned to it so the product has ONE
 * vocabulary instead of two. The parser's behaviour is unchanged: a value
 * outside this list is still rejected.
 */
export const ADVISOR_READINESS = ["EXPLORING", "CONSIDERING", "READY_TO_START", "UNKNOWN"] as const;

export interface AdvisorIntentPayload {
  readonly intents: readonly string[];
  readonly purchase_readiness: string;
  readonly confidence: number;
  readonly unknown_fields: readonly string[];
}

const MAX_INTENTS = 3;
const MAX_UNKNOWN_FIELDS = 8;
/**
 * CA-9C — 120 → 160 for `unknown_fields` ONLY.
 *
 * `unknown_fields` names what the classifier could not determine, so its entries
 * are descriptive phrases rather than the short labels `maxShortText` bounds
 * elsewhere. Across the 403 entries in the 81 parsed CA-9B understanding
 * responses, exactly one exceeded 120 characters (125 at record 155); the second
 * longest was 101. The bound was one phrase short, not wrong.
 *
 * 160 clears the observed maximum by 28 % and is deliberately NOT applied to
 * `SIGNAL_LIMITS.maxShortText`: `business_type` (60), `primary_goal` (78 max
 * observed), `expressed_needs` (74) and `explicit_objections` (88) stay exactly
 * as strict as they were, and a 200-character `business_type` is still rejected.
 */
const MAX_FIELD_CHARS = 160;

function fail(detail: string): never {
  throw new AdvisorProviderError("SCHEMA_INVALID", { detail });
}

export function parseIntentJson(text: string): AdvisorIntentPayload {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail("completion is not valid JSON");
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw))
    fail("payload is not an object");

  const record = raw as Record<string, unknown>;
  const allowedKeys = new Set(["intents", "purchase_readiness", "confidence", "unknown_fields"]);
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) fail(`unexpected key: ${key}`);
  }

  const intents = record["intents"];
  if (!Array.isArray(intents) || intents.length === 0 || intents.length > MAX_INTENTS) {
    fail("intents must be a non-empty array");
  }
  for (const intent of intents) {
    if (typeof intent !== "string" || !(ADVISOR_INTENT_IDS as readonly string[]).includes(intent)) {
      fail("intent is not an allowed id");
    }
  }

  const readiness = record["purchase_readiness"];
  if (
    typeof readiness !== "string" ||
    !(ADVISOR_READINESS as readonly string[]).includes(readiness)
  ) {
    fail("purchase_readiness is not an allowed value");
  }

  const confidence = record["confidence"];
  if (
    typeof confidence !== "number" ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    fail("confidence must be a number in [0,1]");
  }

  const unknownFields = record["unknown_fields"];
  if (!Array.isArray(unknownFields) || unknownFields.length > MAX_UNKNOWN_FIELDS) {
    fail("unknown_fields must be an array");
  }
  for (const field of unknownFields) {
    if (typeof field !== "string" || field.length === 0 || field.length > MAX_FIELD_CHARS) {
      fail("unknown_fields entry is not a bounded string");
    }
  }

  return {
    intents: intents as readonly string[],
    purchase_readiness: readiness,
    confidence,
    unknown_fields: unknownFields as readonly string[],
  };
}
