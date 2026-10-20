/**
 * CA-7.3A — the isolated conversational preview, MOCK PROVIDER ONLY.
 *
 * The critical rule of this phase, verbatim from the brief:
 *
 *   "No declarar E2E PASS si las pruebas reemplazan runConversationalTurn o el
 *    adaptador por mocks. El proveedor sí debe estar simulado, pero el flujo
 *    CA-7.1B y CA-7.2 debe ejecutarse realmente."
 *
 * So the ONLY thing mocked here is the provider TRANSPORT (`fetchImpl`). The
 * turn itself is the real `runConversationalTurn` — real CA-8 reservations over
 * a real ledger, real CA-3 understanding, real CA-4 advice, real CA-6 memory —
 * and the response is the real `adaptAdvisorToAgentResponse`. Nothing in this
 * file reimplements, stubs or shortcuts any of those.
 *
 * The provider is scripted per call (first the CA-3 listening answer, then the
 * CA-4 reply), so a turn is two calls and a two-turn conversation is four.
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { SAFE_FAILURE_REPLY } from "../../advisor/response";
import { createAdvisorGuard, type AdvisorGuard } from "../../guardrails/guard.server";
import {
  createInMemoryGuardrailLedger,
  type AdvisorGuardrailPort,
} from "../../guardrails/ledger.server";
import { DEFAULT_ADVISOR_LIMITS, type AdvisorLimits } from "../../guardrails/limits";
import type { AdvisorProviderConfig } from "../../provider.server";
import { SESSION_LIMITS } from "../../session/context";
import { __resetAllSessionsForTests } from "../../session/store.server";
import { createPreviewHarness, makeClock, type PreviewHarness } from "../harness.server";
import { renderTranscriptHtml, renderTranscriptText } from "../render";
import { PREVIEW_NOTE, executableActions, hasExecutableActions } from "../view-model";

/* ============================== fixtures ================================ */

const BASE_CONFIG: AdvisorProviderConfig = {
  apiKey: "sk-test-NEVER-PRINTED",
  baseUrl: "https://api.test.local",
  model: "deepseek-flash",
  timeoutMs: 5_000,
  maxOutputTokens: 400,
  maxRetries: 0,
  retryBaseDelayMs: 1,
};

const config = (patch: Partial<AdvisorProviderConfig> = {}): AdvisorProviderConfig => ({
  ...BASE_CONFIG,
  ...patch,
});

const limits = (patch: Partial<AdvisorLimits> = {}): AdvisorLimits => ({
  ...DEFAULT_ADVISOR_LIMITS,
  ...patch,
});

const noSleep = async () => {};

/** The reply CA-4 accepts: grounded, no forbidden claim, inside its bounds. */
const SAFE_REPLY =
  "CRIPQER reúne tu información y tus enlaces en una sola página con QR. ¿Quieres que te cuente cómo se ve?";

const listenJson = (patch: Record<string, unknown> = {}) =>
  JSON.stringify({
    intents: ["DISCOVERY"],
    business_type: null,
    primary_goal: null,
    secondary_goals: [],
    expressed_needs: [],
    explicit_objections: [],
    current_tools: [],
    technical_familiarity: "UNKNOWN",
    purchase_readiness: "UNKNOWN",
    next_best_action: "EXPLAIN",
    confidence: 0.8,
    unknown_fields: [],
    ...patch,
  });

const adviseJson = (patch: Record<string, unknown> = {}) =>
  JSON.stringify({
    reply: SAFE_REPLY,
    capability_ids: ["tarjetas_bio"],
    limitations: [],
    ...patch,
  });

const okResponse = (content: string, usage: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }], usage }), { status: 200 });

const USAGE_LISTEN = { prompt_tokens: 200, completion_tokens: 50 };
const USAGE_ADVISE = { prompt_tokens: 300, completion_tokens: 100 };

/**
 * Scripted transport: one entry per expected call, consumed in order and
 * repeated when the plan runs out. The abort signal is honoured, because CA-1
 * aborts on its own timeout and a transport that ignored the signal would make
 * the timeout look like a success.
 */
function scripted(plan: readonly (Response | Error | (() => Response))[]) {
  let call = 0;
  return vi.fn<typeof fetch>(async (_input, init?: RequestInit) => {
    const signal = init?.signal ?? null;
    const step = plan[Math.min(call, plan.length - 1)];
    call += 1;
    if (step === undefined) throw new Error("CA7_3A_TEST: no scripted response");
    if (step instanceof Error) throw step;
    if (signal?.aborted) throw signal.reason;
    return typeof step === "function" ? step() : step;
  });
}

/** A transport that never answers but DOES reject when CA-1 aborts it. */
function stalledTransport() {
  return vi.fn<typeof fetch>(
    (_input, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) return;
        if (signal.aborted) reject(signal.reason);
        else signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      }),
  );
}

/** One healthy turn: the listening call, then the commercial one. */
const happyPath = (listen: Record<string, unknown> = {}, advise: Record<string, unknown> = {}) =>
  scripted([
    okResponse(listenJson(listen), USAGE_LISTEN),
    okResponse(adviseJson(advise), USAGE_ADVISE),
  ]);

/** `turns` healthy turns in a row, so the listen/advise alternation holds. */
const happyTurns = (
  turns: number,
  listen: Record<string, unknown> = {},
  advise: Record<string, unknown> = {},
) =>
  scripted(
    Array.from({ length: turns * 2 }, (_unused, index) =>
      index % 2 === 0
        ? okResponse(listenJson(listen), USAGE_LISTEN)
        : okResponse(adviseJson(advise), USAGE_ADVISE),
    ),
  );

/** A port that records what the guard actually asked the ledger to do. */
function spyPort(l: AdvisorLimits) {
  const inner = createInMemoryGuardrailLedger(l);
  const reserves: { key: string; attempts: number }[] = [];
  const port: AdvisorGuardrailPort = {
    reserve: (key, at, attempts) => {
      reserves.push({ key, attempts: attempts ?? 1 });
      return inner.reserve(key, at, attempts);
    },
    reconcile: (id, tokens, at) => inner.reconcile(id, tokens, at),
    release: (id, at) => inner.release(id, at),
    settleUnknown: (id, at) => inner.settleUnknown(id, at),
    recordOutcome: (outcome, at) => inner.recordOutcome(outcome, at),
    isCircuitOpen: (at) => inner.isCircuitOpen(at),
    metrics: () => inner.metrics(),
    __reset: () => inner.__reset(),
  };
  return { port, reserves };
}

/** Opens a preview harness whose provider transport is the given mock. */
function preview(options: {
  fetchImpl: ReturnType<typeof scripted> | ReturnType<typeof stalledTransport>;
  now: () => number;
  config?: AdvisorProviderConfig | null;
  limits?: AdvisorLimits;
  guard?: AdvisorGuard;
}): PreviewHarness {
  return createPreviewHarness({
    limits: options.limits ?? limits(),
    ...(options.guard === undefined ? {} : { guard: options.guard }),
    config: options.config === undefined ? BASE_CONFIG : options.config,
    providerDeps: { fetchImpl: options.fetchImpl, now: options.now, sleep: noSleep },
    now: options.now,
  });
}

const bodyOf = (fetchImpl: ReturnType<typeof scripted>, call: number): Record<string, unknown> =>
  JSON.parse(String((fetchImpl.mock.calls[call]?.[1] as RequestInit | undefined)?.body)) as Record<
    string,
    unknown
  >;

/** Every string a surface could ever show, for the leak checks. */
const allVisibleText = (harness: PreviewHarness): string =>
  [
    renderTranscriptText(harness.messages()),
    renderTranscriptHtml(harness.messages(), "Preview del asesor"),
    JSON.stringify(harness.messages()),
  ].join("\n");

beforeEach(() => {
  __resetAllSessionsForTests();
});

/* ================= 1-5 · the journey through the preview ================ */

describe("CA-7.3A — a message in, a rendered response out", () => {
  it("1 · the initial message is answered, and the reply is the model's own", async () => {
    const now = makeClock();
    const fetchImpl = happyPath();
    const harness = preview({ fetchImpl, now });

    const result = await harness.send("¿Qué es CRIPQER?");

    expect(result.ok).toBe(true);
    expect(result.status).toBe("ANSWERED");
    expect(result.response?.text).toBe(SAFE_REPLY);
    expect(result.turnsUsed).toBe(1);
    expect(result.turnsRemaining).toBe(SESSION_LIMITS.maxTurnsTotal - 1);
    // Two provider calls: CA-3 understanding, then CA-4 advice.
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(harness.messages()).toHaveLength(2);
    expect(harness.lastStatus()).toBe("ANSWERED");
  });

  it("2 · the answer is visible in the preview surface, as text and as HTML", async () => {
    const now = makeClock();
    const harness = preview({ fetchImpl: happyPath(), now });
    await harness.send("Hola, tengo una tienda de plantas.");

    const transcript = renderTranscriptText(harness.messages());
    const html = renderTranscriptHtml(harness.messages(), "Preview del asesor");

    expect(transcript).toContain("Hola, tengo una tienda de plantas.");
    expect(transcript).toContain(SAFE_REPLY);
    expect(transcript).toContain("Visitante");
    expect(transcript).toContain("Asesor");
    expect(html).toContain(SAFE_REPLY);

    // The surface offers nothing to press and nothing to follow.
    for (const forbidden of ["<a ", "href=", "<button", "<form", "<script", "onclick"]) {
      expect(html.toLowerCase()).not.toContain(forbidden);
    }
  });

  it("3 · two consecutive turns advance the same conversation", async () => {
    const now = makeClock();
    const fetchImpl = happyTurns(2);
    const harness = preview({ fetchImpl, now });

    await harness.send("Primera pregunta.");
    const second = await harness.send("Segunda pregunta.");

    expect(second.turnsUsed).toBe(2);
    expect(second.turnsRemaining).toBe(SESSION_LIMITS.maxTurnsTotal - 2);
    expect(harness.messages()).toHaveLength(4);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("4 · the earlier turn is carried into the next request (temporal memory)", async () => {
    const now = makeClock();
    const fetchImpl = happyTurns(2, { business_type: "panadería" });
    const harness = preview({ fetchImpl, now });

    await harness.send("Tengo una panadería.");
    await harness.send("¿Y ahora qué me recomiendas?");

    // Call 2 is the SECOND turn's understanding call. It must already know the
    // first turn — both as history and as an extracted fact — which is CA-6's
    // memory reaching CA-3 through the real pipeline, not a new feature here.
    const secondUnderstanding = JSON.stringify(bodyOf(fetchImpl, 2));
    expect(secondUnderstanding).toContain("Tengo una panadería.");
    expect(secondUnderstanding).toContain(SAFE_REPLY);
    expect(secondUnderstanding).toContain("rubro ya conocido: panadería");
  });

  it("5 · two preview sessions never see each other's memory", async () => {
    const now = makeClock();
    const fetchA = happyTurns(2);
    const fetchB = happyTurns(2);
    const a = preview({ fetchImpl: fetchA, now: makeClock() });
    const b = preview({ fetchImpl: fetchB, now: makeClock() });

    await a.send("Soy una floristería.");
    await b.send("Vendo repuestos de bicicletas.");
    await a.send("¿Qué me sugieres?");
    await b.send("¿Qué me sugieres?");

    const aContext = JSON.stringify(bodyOf(fetchA, 2));
    const bContext = JSON.stringify(bodyOf(fetchB, 2));

    expect(a.sessionId).not.toBe(b.sessionId);
    expect(aContext).toContain("Soy una floristería.");
    expect(aContext).not.toContain("Vendo repuestos de bicicletas.");
    expect(bContext).toContain("Vendo repuestos de bicicletas.");
    expect(bContext).not.toContain("Soy una floristería.");
  });
});

/* ==================== 6-13 · CA-8 really is in front =================== */

describe("CA-7.3A — every provider call passes through the guard", () => {
  it("6 · an authorised budget lets both operations through, each with its own hold", async () => {
    const now = makeClock();
    const spy = spyPort(limits());
    const guard = createAdvisorGuard(limits(), spy.port);
    const harness = preview({ fetchImpl: happyPath(), now, guard });

    const result = await harness.send("¿Qué es CRIPQER?");

    expect(result.status).toBe("ANSWERED");
    // Two INDEPENDENT reservations, one per operation — not one shared hold.
    expect(spy.reserves).toHaveLength(2);
    const metrics = harness.metrics();
    expect(metrics.attempts).toBe(2);
    expect(metrics.successes).toBe(2);
    expect(metrics.failures).toBe(0);
    expect(metrics.denied["BUDGET_EXHAUSTED"]).toBe(0);
  });

  it("7 · a spent budget degrades the turn instead of calling the provider", async () => {
    const now = makeClock();
    const fetchImpl = happyPath();
    // Exactly one hold fits, so the second operation cannot be authorised.
    const harness = preview({
      fetchImpl,
      now,
      limits: limits({ dailyTokenBudget: DEFAULT_ADVISOR_LIMITS.reservationTokens }),
    });

    const result = await harness.send("¿Qué es CRIPQER?");

    expect(result.status).toBe("DEGRADED");
    expect(harness.metrics().denied["BUDGET_EXHAUSTED"]).toBe(1);
    // Only the authorised call went out; the refused one never reached the wire.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.response?.text).toBe(SAFE_FAILURE_REPLY);
    expect(result.note).toBe(PREVIEW_NOTE.temporarilyUnavailable);
  });

  it("8 · a rate limit stops the next call, and reads as a plain request to wait", async () => {
    const now = makeClock();
    const harness = preview({
      fetchImpl: happyPath(),
      now,
      limits: limits({ sessionRequestsPerWindow: 1 }),
    });

    const result = await harness.send("¿Qué es CRIPQER?");

    expect(result.status).toBe("DEGRADED");
    expect(harness.metrics().denied["SESSION_RATE_LIMIT"]).toBe(1);
    expect(result.note).toBe(PREVIEW_NOTE.tooManyRequests);
    // The denial is never named: no internal vocabulary on the surface.
    expect(allVisibleText(harness)).not.toContain("SESSION_RATE_LIMIT");
  });

  it("9 · an open circuit blocks new calls until it cools down", async () => {
    const now = makeClock();
    const failing = scripted([new Error("boom")]);
    const harness = preview({
      fetchImpl: failing,
      now,
      limits: limits({ circuitFailureThreshold: 1 }),
    });

    await harness.send("Primera.");
    const second = await harness.send("Segunda.");

    expect(harness.metrics().denied["CIRCUIT_OPEN"]).toBeGreaterThanOrEqual(1);
    expect(second.status).toBe("DEGRADED");
    expect(second.note).toBe(PREVIEW_NOTE.temporarilyUnavailable);
  });

  it("10 · the kill switch stops the turn before a single call is made", async () => {
    const now = makeClock();
    const fetchImpl = happyPath();
    const harness = preview({ fetchImpl, now, limits: limits({ killSwitch: true }) });

    const result = await harness.send("¿Qué es CRIPQER?");

    expect(result.status).toBe("DEGRADED");
    expect(harness.metrics().denied["KILL_SWITCH"]).toBe(1);
    expect(harness.metrics().attempts).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("11 · a provider that is down yields the safe reply, and the turn still happens", async () => {
    const now = makeClock();
    const fetchImpl = scripted([new Error("ECONNREFUSED")]);
    const harness = preview({ fetchImpl, now });

    const result = await harness.send("¿Qué es CRIPQER?");

    expect(result.status).toBe("DEGRADED");
    expect(result.response?.text).toBe(SAFE_FAILURE_REPLY);
    // Both operations were attempted (understanding and advice), and neither
    // consumption was fabricated as zero.
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(harness.metrics().unknownConsumptionSettlements).toBe(2);
  });

  it("12 · a timeout is charged, not forgiven", async () => {
    const now = makeClock();
    const stalled = stalledTransport();
    const harness = preview({
      fetchImpl: stalled,
      now,
      config: config({ timeoutMs: 10 }),
    });

    const result = await harness.send("¿Qué es CRIPQER?");

    expect(result.status).toBe("DEGRADED");
    expect(harness.metrics().unknownConsumptionSettlements).toBeGreaterThanOrEqual(1);
    expect(result.response?.text).toBe(SAFE_FAILURE_REPLY);
  });

  it("13 · an unmeasurable consumption is never reported as a free call", async () => {
    const now = makeClock();
    // 200 with no usage block: CA-1 reads 0/0, which CA-3/CA-4 call UNKNOWN.
    const zeroed = scripted([okResponse(listenJson(), {}), okResponse(adviseJson(), {})]);
    // Exactly two holds fit, so the proof is what comes AFTER: if the unknown
    // consumption had been treated as free, a third hold would still fit.
    const harness = preview({
      fetchImpl: zeroed,
      now,
      limits: limits({ dailyTokenBudget: DEFAULT_ADVISOR_LIMITS.reservationTokens * 2 }),
    });

    const result = await harness.send("¿Qué es CRIPQER?");

    expect(result.status).toBe("DEGRADED");
    expect(harness.metrics().unknownConsumptionSettlements).toBe(2);
    // The reply IS the model's and it IS grounded — what failed is the
    // accounting, so the honest note is the one about the turn, not the reply.
    expect(result.note).toBe(PREVIEW_NOTE.turnNotVerified);

    // Both holds were imputed, so the budget really moved: a fresh turn cannot
    // be authorised. That is the difference between "unknown" and "free".
    const after = await harness.send("¿Y ahora?");
    expect(after.status).toBe("DEGRADED");
    expect(harness.metrics().denied["BUDGET_EXHAUSTED"]).toBe(1);
  });
});

/* =============== 14-20 · the commercial surface stays safe ============= */

describe("CA-7.3A — what the preview is allowed to show", () => {
  it("14 · a valid commercial reply is shown verbatim", async () => {
    const now = makeClock();
    const harness = preview({ fetchImpl: happyPath(), now });

    const result = await harness.send("¿Qué es CRIPQER?");

    expect(result.status).toBe("ANSWERED");
    expect(result.response?.text).toBe(SAFE_REPLY);
    expect(result.note).toBeNull();
  });

  it("15 · an unsafe commercial reply never reaches the surface", async () => {
    const now = makeClock();
    const unsafe = "Te garantizamos 100 clientes nuevos cada mes y 500000 pesos de ingresos.";
    const harness = preview({ fetchImpl: happyPath({}, { reply: unsafe }), now });

    const result = await harness.send("¿Qué es CRIPQER?");

    expect(result.status).toBe("FALLBACK");
    expect(result.response?.text).toBe(SAFE_FAILURE_REPLY);
    expect(allVisibleText(harness)).not.toContain("100 clientes nuevos");
    expect(allVisibleText(harness)).not.toContain("500000");
  });

  it("16 · a safe fallback is visibly distinct from a real answer", async () => {
    const now = makeClock();
    const unsafe = "Te garantizamos 100 clientes nuevos cada mes.";
    const harness = preview({ fetchImpl: happyPath({}, { reply: unsafe }), now });

    const result = await harness.send("¿Qué es CRIPQER?");

    // The provider was consulted and settled normally, so this is NOT degraded.
    expect(result.status).toBe("FALLBACK");
    expect(result.note).toBe(PREVIEW_NOTE.answerNotVerified);
    expect(harness.metrics().successes).toBe(2);
    // The internal marker CA-4 attaches to a fallback is never rendered.
    expect(allVisibleText(harness)).not.toContain("respuesta_no_emitida");
  });

  it("17 · the preview offers no executable action, ever", async () => {
    const now = makeClock();
    const harness = preview({ fetchImpl: happyPath(), now });

    await harness.send("¿Qué es CRIPQER?");

    expect(executableActions(harness.messages())).toEqual([]);
    for (const message of harness.messages()) {
      expect(message.actions).toEqual([]);
      expect(hasExecutableActions(message)).toBe(false);
    }
  });

  it("18 · the Guest Editor stays blocked: a suggestion is not an action", async () => {
    const now = makeClock();
    const fetchImpl = happyPath(
      { intents: ["START_CREATION"], next_best_action: "OFFER_GUEST_EDITOR" },
      { capability_ids: ["plan_free"] },
    );
    const harness = preview({ fetchImpl, now });

    await harness.send("quiero empezar");

    // CA-5 degrades the offer, and CA-7.2's crosswalk is empty, so nothing is
    // executable and no editor destination is written anywhere.
    expect(executableActions(harness.messages())).toEqual([]);
    expect(allVisibleText(harness)).not.toContain("/crear-tarjeta");
    expect(allVisibleText(harness)).not.toContain("CREATE_PAGE");
  });

  it("19 · no route or destination is invented by the surface", async () => {
    const now = makeClock();
    const harness = preview({ fetchImpl: happyPath(), now });

    await harness.send("Hola.");

    const html = renderTranscriptHtml(harness.messages(), "Preview del asesor");
    for (const forbidden of [
      "/crear-tarjeta",
      "CREATE_PAGE",
      "OFFER_GUEST_EDITOR",
      "<a ",
      "href=",
    ]) {
      expect(html).not.toContain(forbidden);
      expect(renderTranscriptText(harness.messages())).not.toContain(forbidden);
    }
  });

  it("20 · no secret or internal diagnostic reaches the surface", async () => {
    const now = makeClock();
    const harness = preview({ fetchImpl: happyPath(), now });

    await harness.send("¿Qué es CRIPQER?");
    const visible = allVisibleText(harness);

    for (const secret of [
      BASE_CONFIG.apiKey,
      "sk-",
      "Bearer",
      "Authorization",
      "apiKey",
      "DEEPSEEK_API_KEY",
      "degraded_reason",
      "GUARD_DENIED",
      "UNDERSTANDING_FAILED",
      "COMMERCIAL_FAILED",
      "reservation",
      "usage",
    ]) {
      expect(visible).not.toContain(secret);
    }
  });
});

/* ================= 21-24 · nothing leaves, nothing moves =============== */

describe("CA-7.3A — the preview is isolated from the outside world", () => {
  it("21 · no real provider is ever called: only the injected transport is used", async () => {
    const now = makeClock();
    const fetchImpl = happyPath();
    const harness = preview({ fetchImpl, now });

    const realFetch = globalThis.fetch;
    const globalSpy = vi.fn(realFetch);
    globalThis.fetch = globalSpy as typeof fetch;
    try {
      await harness.send("¿Qué es CRIPQER?");
    } finally {
      globalThis.fetch = realFetch;
    }

    expect(globalSpy).not.toHaveBeenCalled();
    for (const call of fetchImpl.mock.calls) {
      const url = String(call[0]);
      expect(url.startsWith(BASE_CONFIG.baseUrl)).toBe(true);
      expect(url).not.toContain("deepseek.com");
    }
  });

  it("22 · the preview writes nothing anywhere: no remote call, no database", async () => {
    const now = makeClock();
    const fetchImpl = happyPath();
    const harness = preview({ fetchImpl, now });

    const realFetch = globalThis.fetch;
    const globalSpy = vi.fn(() => {
      throw new Error("CA7_3A_TEST: the preview must not touch the global transport");
    });
    globalThis.fetch = globalSpy as unknown as typeof fetch;
    let result;
    try {
      result = await harness.send("¿Qué es CRIPQER?");
    } finally {
      globalThis.fetch = realFetch;
    }

    expect(result.status).toBe("ANSWERED");
    expect(globalSpy).not.toHaveBeenCalled();
    for (const call of fetchImpl.mock.calls) {
      const url = String(call[0]);
      expect(url).not.toContain("supabase");
      expect(url.startsWith("https://api.test.local/")).toBe(true);
    }
  });

  it("23 · the landing is byte-identical: not one of its files moved", () => {
    // A phase gate, not a general rule. It encodes "no_landing_changes" for
    // CA-7.3A; a later phase that is ALLOWED to touch the landing must update
    // this digest on purpose.
    //
    // CA-11 (2026-10-19): the digest moved ON PURPOSE, behind this phase's own
    // authorization — "edit conversational-landing integration". The landing
    // gained the Advisor mount (`hooks/useCripqerSession.ts`), the transport
    // (`advisor/transport.ts` and its three scoped test files), the transcript
    // rendering in `components/converse/ConverseStage.tsx`, the optional host
    // seams in `App.tsx`, `CripqerExperience.tsx`, `index.tsx` and
    // `types/cripqer.ts`, and the composer's `maxLength` prop. The temporary
    // template-selection architecture is unchanged, and so is every rotation
    // file. The pin keeps its teeth: any future edit still fails it.
    //
    // CA-12 (2026-10-19): the digest moved ON PURPOSE, behind this phase's own
    // authorization — "edit phase pin test; add narrow tests". The landing
    // gained exactly TWO scoped certification files,
    // `advisor/__tests__/race-conditions.test.ts` and
    // `advisor/__tests__/failure-isolation.test.ts`; not one existing landing
    // file changed. Proven independently: the same digest computed over the
    // 45-file set with those two files excluded is still `bd26db4c…`, the
    // CA-11 seal. The temporary template-selection architecture and every
    // rotation file are untouched.
    //
    // CONV-02 (2026-10-20): the digest and the count moved ON PURPOSE, behind
    // the main-tree integration brief. The landing gained the ONE provider
    // bridge (`assistant/advisors/{contract,provider,transport}.ts`), the
    // action adapter (`assistant/landingActionAdapter.ts`), the deterministic
    // planner (`utils/landingPlan.ts`), the seed fixture
    // (`utils/seedResponses.ts`), the imported Advisor transcript/controller
    // (`advisor/*`), their scoped tests, and additive exports in
    // `utils/agent.ts`. The public landing is NOT wired in this phase:
    // `useCripqerSession.ts` and every rotation file are byte-identical, and
    // the CONV-02 report lists every changed path with its hash. The CA-11
    // landing-mount and route-wiring tests were DELIBERATELY NOT IMPORTED
    // (`docs/conv02/rejected/`): they assert the props and the hook cutover
    // that CONV-03 owns, so they cannot compile or pass in an unwired tree.
    const root = repositoryRoot();
    const landingRoot = join(root, "src", "features", "approved-chat-landing");
    const files = walkFiles(landingRoot);

    expect(files).toHaveLength(84);
    expect(directoryDigest(landingRoot, files)).toBe(LANDING_DIGEST);
  });

  it("24 · every frozen module is byte-identical to its baseline", () => {
    const root = repositoryRoot();
    for (const [relative, digest] of Object.entries(FROZEN_MODULES)) {
      const bytes = readFileSync(join(root, relative));
      expect(createHash("md5").update(bytes).digest("hex")).toBe(digest);
    }
  });
});

/* ======================= end-to-end, local, real ====================== */

describe("CA-7.3A — the complete local journey, with only the provider mocked", () => {
  it("the pipeline is REAL: neither the turn nor the adapter is a mock", async () => {
    // The brief's critical rule, asserted rather than promised: the E2E below is
    // only meaningful because these two are the real implementations.
    const turnModule = await import("../../integration/turn.server");
    const adapterModule = await import("../../integration/landing-adapter");

    expect(vi.isMockFunction(turnModule.runConversationalTurn)).toBe(false);
    expect(vi.isMockFunction(adapterModule.adaptAdvisorToAgentResponse)).toBe(false);
    // And the harness calls those exact functions, not a local copy of them.
    const source = readFileSync(join(HERE, "..", "harness.server.ts"), "utf8");
    expect(source).toContain('from "../integration/turn.server"');
    expect(source).toContain('from "../integration/landing-adapter"');
  });

  it("E2E · a visitor message becomes a visible answer, twice, reproducibly", async () => {
    const run = async () => {
      const now = makeClock();
      const fetchImpl = happyTurns(2);
      const harness = preview({ fetchImpl, now });

      // 1. The visitor's message goes in.
      const first = await harness.send("Vendo tortas por encargo.");
      // 2. It really passed through CA-7.1B (two calls: understanding, advice).
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      expect(first.status).toBe("ANSWERED");
      // 3. CA-8 was active: two authorised reservations, both reconciled.
      expect(harness.metrics().attempts).toBe(2);
      expect(harness.metrics().successes).toBe(2);
      // 4. CA-7.2 adapted it, and the adapter produced no action.
      expect(first.response).not.toBeNull();
      expect(first.response?.actions).toEqual([]);

      // 5. The second turn carries the first one's context.
      const second = await harness.send("¿Cómo se vería?");
      expect(second.turnsUsed).toBe(2);
      expect(JSON.stringify(bodyOf(fetchImpl, 2))).toContain("Vendo tortas por encargo.");

      // 6. The whole exchange is visible on the surface.
      const text = renderTranscriptText(harness.messages());
      expect(text).toContain("Vendo tortas por encargo.");
      expect(text).toContain("¿Cómo se vería?");
      expect(text.split(SAFE_REPLY).length - 1).toBe(2);

      return { text, html: renderTranscriptHtml(harness.messages(), "Preview del asesor") };
    };

    const first = await run();
    const second = await run();

    // 7. Reproducible: the same scripted conversation renders identically.
    expect(second.text).toBe(first.text);
    expect(second.html).toBe(first.html);
  });
});

/* ============================ frozen sets ============================== */

const HERE = dirname(fileURLToPath(import.meta.url));

function repositoryRoot(): string {
  // __tests__ → preview → conversion-advisor → lib → src → repo root.
  return join(HERE, "..", "..", "..", "..", "..");
}

function walkFiles(root: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) found.push(...walkFiles(full));
    else if (entry.isFile()) found.push(full);
  }
  return found;
}

/**
 * A digest over the file LIST as well as its contents: adding, removing or
 * editing any file changes the result. Paths are normalised to `/` so the same
 * tree digests the same way on Windows and on CI.
 */
function directoryDigest(root: string, files: readonly string[]): string {
  const lines = files
    .map((file) =>
      file
        .slice(root.length + 1)
        .split("\\")
        .join("/"),
    )
    .sort()
    .map((relative) => {
      const bytes = readFileSync(join(root, relative));
      return `${relative}:${createHash("md5").update(bytes).digest("hex")}`;
    });
  return createHash("md5").update(lines.join("\n")).digest("hex");
}

/**
 * 84 files, aggregate digest of `src/features/approved-chat-landing/**`.
 * CA-11 seal: `bd26db4c7e52dd70851f1a0d32a81a73` over 45 files. CA-12 adds two
 * certification test files and no other landing bytes; excluding them
 * reproduces the CA-11 seal exactly.
 * CONV-02 (2026-10-20) adds the advisor bridge, planner, seed fixture, the
 * imported transcript/controller and their scoped tests — 47 → 84 files.
 */
const LANDING_DIGEST = "20a4ae55596c1728bfe731c648ebcd40";

/**
 * The modules CA-7.3A must not touch. Same technique as CA-7.1B's test 26, so
 * the two phases pin the same bytes with the same numbers.
 */
const FROZEN_MODULES: Readonly<Record<string, string>> = {
  // CA-9A.2 (2026-10-16): this ONE entry was updated on purpose, behind the
  // owner's model-alignment decision (default deepseek-chat → deepseek-flash,
  // the only id with a verified price: evaluation/pricing.ts). Every other entry
  // here is byte-identical, and no behaviour of the pipeline changed.
  //
  // CA-9C (2026-10-17): two entries moved, each behind a CA-9B-recorded finding —
  // `provider.server.ts` (maxOutputTokens 800 → 3 584; unknown_fields bound
  // 120 → 160) and `advisor/response.ts` (maxReplyChars 900 → 1 000). The same
  // two updates are recorded in CA-7.1B's test 26; this manifest mirrors it so
  // the two phases cannot drift.
  //
  // CA-10B (2026-10-19): three entries moved, behind the phase's own contract —
  // the ONE executable action, internal navigation to `/help`:
  //   · `actions/registry.ts` and `actions/policy.ts` (the same updates recorded
  //     in CA-7.1B's test 26: OPEN_HELP, the executable destination allowlist,
  //     the clock-free branch and `revalidateExecutableAction`);
  //   · `integration/landing-adapter.ts`, whose crosswalk classifies the new id
  //     (`OPEN_HELP: []`) so the `Record<ActionId, …>` stays exhaustive.
  // `integration/__tests__/landing-adapter.test.ts` moved only in one test
  // TITLE (the id it names), never in an assertion.
  //
  // CONV-02 (2026-10-20): five entries moved, each behind the main-tree
  // integration brief and mirrored in CA-7.1B's test 26 where it names the same
  // file:
  //   · `provider.server.ts` — `ADVISOR_MODEL` precedence and the 12 000 ms /
  //     1-retry defaults (48.8 s worst case inside the 60 s browser deadline);
  //   · `advisor/orchestrator.server.ts` — consultative/honesty guidance and the
  //     optional, bounded `LandingContextSnapshot`;
  //   · `integration/contract.ts` — the optional `landingContext` request key,
  //     the published `model`, and the closed `AssistantTurnResult` union;
  //   · `integration/turn.server.ts` — landing context forwarded to both
  //     orchestrator calls and the eight allowlisted observability events;
  //   · `integration/__tests__/landing-adapter.test.ts` — fixtures name the new
  //     `model` field; no assertion changed.
  // No guardrail, capability, action-policy, session or response module moved.
  "src/lib/conversion-advisor/provider.server.ts": "fccf07c0ad90894134a43fd2b77b9a1f",
  "src/lib/conversion-advisor/guardrails/guard.server.ts": "c72d573ee40148951992cd8d2f0218c0",
  "src/lib/conversion-advisor/guardrails/ledger.server.ts": "ab77b78047e44a3eba3808f12a25a393",
  "src/lib/conversion-advisor/guardrails/limits.ts": "5867d39cd1b2f0845151ded515e4b363",
  // CA-12 (2026-10-19): this ONE entry moved, behind the phase's own
  // authorization — the deterministic fast path records its provenance in the
  // SAME signal vocabulary CA-3 produces (`source: "MODEL" | "DETERMINISTIC" |
  // "FALLBACK"`, `fallback_reason`). No intent, field or decision changed; the
  // resolver returns the classifier's own `VisitorSignals` shape.
  "src/lib/conversion-advisor/intents/contract.ts": "ad68651fdc993e13278ffcb18306b6da",
  "src/lib/conversion-advisor/intents/classifier.server.ts": "ce65e2b23525a13c3a6194805151eca9",
  "src/lib/conversion-advisor/advisor/orchestrator.server.ts": "db46237e4f568b1e08b168a8361e74cb",
  "src/lib/conversion-advisor/advisor/response.ts": "3dc66eee711b35736a43439c48b1b017",
  "src/lib/conversion-advisor/advisor/strategy.ts": "1bc9fdd465118ef796fe91d5c2ce269c",
  "src/lib/conversion-advisor/session/context.ts": "fe01b0be51dbc7514b1521b755020c9f",
  "src/lib/conversion-advisor/session/store.server.ts": "962dcb47fe7cf773fef16128c35034a9",
  "src/lib/conversion-advisor/actions/registry.ts": "944e9d12f4d55a5479c6af054ad33a05",
  "src/lib/conversion-advisor/actions/policy.ts": "293abea97ead50b5fad0dc6cfb51e080",
  "src/lib/conversion-advisor/capabilities/catalog.ts": "0c2b3a086d1812051bd3c3c68c42a5df",
  "src/lib/conversion-advisor/integration/contract.ts": "db2bac103d2d12cb1d32bc792ad739c4",
  "src/lib/conversion-advisor/integration/turn.server.ts": "d0805bc72062605c04408a872b924ad1",
  // CA-11 (2026-10-19): this ONE entry moved, behind the phase's own server
  // boundary — `askAdvisorUiTurnFn` was added: it runs ONE
  // `runConversationalTurn` and returns the CA-7.4-A projection, so the browser
  // receives the validated contract response and never a `TurnOutcome`. Its
  // header was then corrected to state that CA-11 mounted it (a comment-only
  // edit: the handlers are byte-identical to the pre-correction file). No other
  // frozen module moved and no pipeline behavior changed.
  "src/lib/conversion-advisor/integration/server.ts": "2569e5db13cc528d357f9d8b3ecf2df4",
  "src/lib/conversion-advisor/integration/landing-adapter.ts": "4f3d5e3ef333b049aa68bc205c593f63",
  "src/lib/conversion-advisor/integration/__tests__/landing-adapter.test.ts":
    "97a7b2a8da5e0490bb05813781a691e0",
};
