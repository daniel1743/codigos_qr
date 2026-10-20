// @vitest-environment happy-dom
/**
 * CRIPQER Conversion Advisor — CA-7.4-B · the isolated surface against the REAL
 * pipeline.
 *
 * The critical rule of this phase, and the one this file exists to keep:
 *
 *   "No mockear runConversationalTurn. No mockear CA-8. No mockear el adaptador
 *    CA-7.2."
 *
 * So the ONLY thing simulated here is the provider TRANSPORT (`fetchImpl`). A
 * turn typed into the rendered React surface travels the real path —
 *
 *   AdvisorConversation → useAdvisorConversation → conversation-controller
 *     → CA-7.4-A projection ← runConversationalTurn (CA-7.1B)
 *         → CA-8 reservations over a real ledger
 *         → CA-3 understanding → CA-4 advice → CA-6 memory
 *
 * — and nothing in this file reimplements, stubs or shortcuts any of it. The
 * scripted provider transport and the monotonic clock are CA-7.3A's own harness
 * fixtures, reused from this Node/happy-dom context exactly as the brief allows
 * ("Reutilizar el harness real de CA-7.3A únicamente desde contexto de servidor
 * o pruebas Node").
 *
 * WHY happy-dom AND NOT A LIBRARY. This repository has no Testing Library and no
 * jsdom, and this phase may install nothing. The idiom used here is the repo's
 * own, taken from its other 75 `.test.tsx` files: `createRoot`, React's `act`,
 * and `IS_REACT_ACT_ENVIRONMENT`.
 */

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAdvisorGuard } from "../../guardrails/guard.server";
import { createInMemoryGuardrailLedger } from "../../guardrails/ledger.server";
import { DEFAULT_ADVISOR_LIMITS, type AdvisorLimits } from "../../guardrails/limits";
import { runConversationalTurn, startAdvisorSession } from "../../integration/turn.server";
import { projectAdvisorTurn } from "../../integration/ui-projection";
import { makeClock } from "../../preview/harness.server";
import type { AdvisorProviderConfig } from "../../provider.server";
import { __resetAllSessionsForTests } from "../../session/store.server";
import { AdvisorConversation } from "../AdvisorConversation";
import type { AdvisorTransport } from "../types";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/* ============================== fixtures ================================ */

const TEST_CONFIG: AdvisorProviderConfig = {
  apiKey: "sk-test-NEVER-PRINTED",
  baseUrl: "https://api.test.local",
  model: "deepseek-flash",
  timeoutMs: 5_000,
  maxOutputTokens: 400,
  maxRetries: 0,
  retryBaseDelayMs: 1,
};

/** The reply CA-4 accepts: grounded, no forbidden claim, inside its bounds. */
const SAFE_REPLY =
  "CRIPQER reúne tu información y tus enlaces en una sola página con QR. ¿Quieres que te cuente cómo se ve?";

const listenJson = (patch: Record<string, unknown> = {}): string =>
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

const adviseJson = (patch: Record<string, unknown> = {}): string =>
  JSON.stringify({
    reply: SAFE_REPLY,
    capability_ids: ["tarjetas_bio"],
    limitations: [],
    ...patch,
  });

const okResponse = (content: string, usage: Record<string, unknown> = {}): Response =>
  new Response(JSON.stringify({ choices: [{ message: { content } }], usage }), { status: 200 });

/**
 * Real usage numbers, not `{}`. CA-3/CA-4 read an absent usage block as UNKNOWN
 * consumption, and CA-7.1B deliberately treats unknown consumption as a FAILED
 * operation rather than a free call — so a fixture that omits them would test
 * the degraded path while claiming to test the healthy one.
 */
const USAGE_LISTEN = { prompt_tokens: 200, completion_tokens: 50 };
const USAGE_ADVISE = { prompt_tokens: 300, completion_tokens: 100 };

/** Scripted provider transport: one entry per expected call, in order. */
function scripted(plan: readonly (Response | Error)[]) {
  let call = 0;
  return vi.fn<typeof fetch>(async (_input, init?: RequestInit) => {
    const signal = init?.signal ?? null;
    const step = plan[Math.min(call, plan.length - 1)];
    call += 1;
    if (step === undefined) throw new Error("CA7_4B_TEST: no scripted response");
    if (step instanceof Error) throw step;
    if (signal?.aborted) throw signal.reason;
    return step;
  });
}

/**
 * One healthy turn: the listening call, then the commercial one.
 *
 * The usage numbers are REAL in both, and that is load-bearing: CA-3/CA-4 read
 * an absent usage block as UNKNOWN consumption, and CA-7.1B deliberately treats
 * unknown consumption as a FAILED operation rather than a free call. A fixture
 * that omitted them would exercise the degraded path while claiming to exercise
 * the healthy one.
 */
const happyTurn = (): ReturnType<typeof scripted> =>
  scripted([okResponse(listenJson(), USAGE_LISTEN), okResponse(adviseJson(), USAGE_ADVISE)]);

/**
 * A DEGRADED turn, built the way CA-7.1B really builds one.
 *
 * The listening call returns perfectly good signals but reports NO usage, so its
 * consumption is UNKNOWN — CA-8's ledger may not reconcile a number nobody
 * measured, and the operation is reported as failed while the value it produced
 * (the real signals) is kept. The commercial call then runs normally and returns
 * a grounded reply. Grounded text from a turn that carried a degradation
 * condition is exactly what DEGRADED names.
 */
const degradedTurn = (): ReturnType<typeof scripted> =>
  scripted([okResponse(listenJson(), {}), okResponse(adviseJson(), USAGE_ADVISE)]);

/**
 * A healthy turn whose proposal is OFFER_HELP — the ONE action that is
 * executable after CA-10B. The proposal travels the real CA-3 → CA-4 path
 * (`decideAction` honours it), so the action the surface renders is derived by
 * the production projection from a real `TurnOutcome`, not injected.
 */
const helpTurn = (): ReturnType<typeof scripted> =>
  scripted([
    okResponse(listenJson({ next_best_action: "OFFER_HELP" }), USAGE_LISTEN),
    okResponse(adviseJson(), USAGE_ADVISE),
  ]);

/** A session id that is WELL FORMED and does not exist — CA-6's own distinction. */
const UNKNOWN_SESSION_ID = "00000000-0000-4000-8000-000000000000";

/* ========================= the real pipeline transport =================== */

interface PipelineOptions {
  readonly fetchImpl: typeof fetch;
  readonly limits?: AdvisorLimits;
  readonly config?: AdvisorProviderConfig | null;
}

/**
 * The surface's transport, backed by the REAL pipeline.
 *
 * This is the seam the brief describes: the harness runs the existing internal
 * pipeline, and only the PROVIDER's transport is simulated. The guard is built
 * over its own in-memory ledger — the process-wide guard, which fixes its limits
 * from the real environment, is never touched — and the provider config is
 * always explicit, so `process.env` is never read for a credential.
 */
function pipelineTransport(options: PipelineOptions): AdvisorTransport {
  const limits = options.limits ?? DEFAULT_ADVISOR_LIMITS;
  const guard = createAdvisorGuard(limits, createInMemoryGuardrailLedger(limits));
  const now = makeClock();
  const config = options.config === undefined ? TEST_CONFIG : options.config;
  const sessionId = startAdvisorSession(now()).session_id;

  return async ({ text }) => {
    const run = await runConversationalTurn(
      { sessionId, message: text },
      {
        config,
        guard,
        providerDeps: { fetchImpl: options.fetchImpl, now, sleep: async () => {} },
        now,
      },
    );

    // A turn refused before an outcome could exist, and a completed turn, are
    // the two things CA-7.4-A's projection takes. Neither is faked here.
    return run.ok
      ? projectAdvisorTurn({ kind: "turn", outcome: run.outcome })
      : projectAdvisorTurn({ kind: "refusal", reason: run.reason });
  };
}

/** A transport the test releases by hand, so a turn can be observed in flight. */
function heldTransport(): {
  readonly transport: AdvisorTransport;
  release: (value: unknown) => void;
} {
  let release: ((value: unknown) => void) | null = null;
  return {
    transport: () =>
      new Promise<unknown>((resolve) => {
        release = resolve;
      }),
    release: (value) => release?.(value),
  };
}

/* ============================== the DOM ================================= */

const mounted: Array<() => void> = [];

function mount(node: ReactElement): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(node);
  });
  mounted.push(() => {
    act(() => {
      root.unmount();
    });
    host.remove();
  });
  return host;
}

/** Lets the controller's promise chain run and React commit the result. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/**
 * Types into the textarea the way a person does: through the NATIVE value setter
 * and an `input` event, because assigning `.value` directly does not reach a
 * controlled React field.
 */
function type(host: HTMLElement, value: string): void {
  const field = host.querySelector("textarea");
  if (field === null) throw new Error("CA7_4B_TEST: no textarea");
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (setter === undefined) throw new Error("CA7_4B_TEST: no native value setter");
  act(() => {
    setter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/**
 * Submits the form. The event is dispatched rather than clicked ON PURPOSE: a
 * disabled submit button cannot be clicked, and the second layer of the
 * double-submit defence is the one that has to hold when the DOM is bypassed.
 */
function submit(host: HTMLElement): void {
  const form = host.querySelector("form");
  if (form === null) throw new Error("CA7_4B_TEST: no form");
  act(() => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

function buttons(host: HTMLElement): readonly HTMLButtonElement[] {
  return [...host.querySelectorAll("button")];
}

function buttonLabels(host: HTMLElement): readonly string[] {
  return buttons(host).map((button) => button.textContent ?? "");
}

function submitButton(host: HTMLElement): HTMLButtonElement {
  const button = buttons(host).find((candidate) => candidate.type === "submit");
  if (button === undefined) throw new Error("CA7_4B_TEST: no submit button");
  return button;
}

function entries(host: HTMLElement): readonly Element[] {
  return [...host.querySelectorAll("[data-entry-id]")];
}

function advisorStatuses(host: HTMLElement): readonly (string | null)[] {
  return [...host.querySelectorAll("[data-status]")].map((node) =>
    node.getAttribute("data-status"),
  );
}

function advisorTexts(host: HTMLElement): readonly string[] {
  return [...host.querySelectorAll('[data-role="ADVISOR"] p')].map(
    (node) => node.textContent ?? "",
  );
}

function visitorTexts(host: HTMLElement): readonly string[] {
  return [...host.querySelectorAll('[data-role="VISITOR"] p')].map(
    (node) => node.textContent ?? "",
  );
}

function statusTexts(host: HTMLElement): readonly string[] {
  return [...host.querySelectorAll("[data-status]")].map((node) => node.textContent ?? "");
}

/** One full turn through the real surface, with the real pipeline behind it. */
async function sendTurn(host: HTMLElement, text: string): Promise<void> {
  type(host, text);
  submit(host);
  await settle();
}

/* =============================== setup ================================== */

beforeEach(() => {
  __resetAllSessionsForTests();
});

afterEach(() => {
  while (mounted.length > 0) mounted.pop()?.();
});

/* ============================== the states ============================== */

describe("the six states, as a visitor meets them", () => {
  it("shows PROCESSING while the turn is in flight", async () => {
    const held = heldTransport();
    const host = mount(<AdvisorConversation transport={held.transport} />);

    type(host, "hola");
    submit(host);

    // Recorded and in flight the moment the turn is accepted.
    expect(advisorStatuses(host)).toEqual(["PROCESSING"]);
    expect(statusTexts(host)[0]).toContain("Procesando");
    // What a person sees: the button is unavailable while the turn is open.
    expect(submitButton(host).disabled).toBe(true);
    expect(host.querySelector("ol")?.getAttribute("aria-busy")).toBe("true");
    // The visitor's own message is already on screen, and the advisor's is not.
    expect(visitorTexts(host)).toEqual(["hola"]);
    expect(advisorTexts(host)).toEqual(["Estamos preparando tu respuesta."]);

    // Let the transport be reached, so the release below has something to
    // release — the transport is invoked on a microtask, not during `submit`.
    await settle();
    expect(advisorStatuses(host)).toEqual(["PROCESSING"]);

    held.release(projectAdvisorTurn({ kind: "error" }));
    await settle();
    expect(advisorStatuses(host)).toEqual(["ERROR"]);
  });

  it("shows ANSWERED, with no notice, for a grounded turn that ran as designed", async () => {
    const fetchImpl = happyTurn();
    const host = mount(<AdvisorConversation transport={pipelineTransport({ fetchImpl })} />);

    await sendTurn(host, "quiero una página con QR");

    expect(advisorStatuses(host)).toEqual(["ANSWERED"]);
    expect(statusTexts(host)[0]).toBe("Respuesta del asesor");
    // The reply is CA-4's, verbatim — the surface rewrites nothing.
    expect(advisorTexts(host)).toEqual([SAFE_REPLY]);
    expect(submitButton(host).disabled).toBe(false);
    // A validated answer offers no retry.
    expect(buttonLabels(host)).not.toContain("Reintentar");
  });

  it("shows DEGRADED when the turn carried a degradation condition", async () => {
    const fetchImpl = degradedTurn();
    const host = mount(<AdvisorConversation transport={pipelineTransport({ fetchImpl })} />);

    await sendTurn(host, "cuéntame más");

    expect(advisorStatuses(host)).toEqual(["DEGRADED"]);
    expect(statusTexts(host)[0]).toContain("Respuesta con aviso");
    // The notice comes from the contract's own table, never assembled here.
    expect(statusTexts(host)[0]).toContain(
      "Esta respuesta está verificada, pero el turno no se completó del todo.",
    );
  });

  it("shows FALLBACK when no validated commercial answer exists", async () => {
    const fetchImpl = happyTurn();
    const host = mount(
      <AdvisorConversation transport={pipelineTransport({ fetchImpl, config: null })} />,
    );

    await sendTurn(host, "hola");

    expect(advisorStatuses(host)).toEqual(["FALLBACK"]);
    expect(statusTexts(host)[0]).toContain("Respuesta segura");
    expect(statusTexts(host)[0]).toContain(
      "Esto no es una recomendación verificada: no pudimos confirmar una respuesta para tu mensaje.",
    );
    // Not configured: no provider call was made at all.
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("shows REFUSED when CA-8 refuses the turn", async () => {
    const fetchImpl = happyTurn();
    const host = mount(
      <AdvisorConversation
        transport={pipelineTransport({
          fetchImpl,
          limits: { ...DEFAULT_ADVISOR_LIMITS, killSwitch: true },
        })}
      />,
    );

    await sendTurn(host, "hola");

    expect(advisorStatuses(host)).toEqual(["REFUSED"]);
    expect(statusTexts(host)[0]).toContain("Solicitud no atendida");
    // A refused turn is refused BEFORE the call: the provider was never consulted.
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("shows REFUSED when the conversation itself is unknown", async () => {
    const transport: AdvisorTransport = async ({ text }) => {
      const run = await runConversationalTurn(
        { sessionId: UNKNOWN_SESSION_ID, message: text },
        { config: TEST_CONFIG, providerDeps: { fetchImpl: scripted([]) } },
      );
      return run.ok
        ? projectAdvisorTurn({ kind: "turn", outcome: run.outcome })
        : projectAdvisorTurn({ kind: "refusal", reason: run.reason });
    };
    const host = mount(<AdvisorConversation transport={transport} />);

    await sendTurn(host, "hola");

    expect(advisorStatuses(host)).toEqual(["REFUSED"]);
    expect(advisorTexts(host)).toEqual(["Esta conversación ya no está disponible."]);
    expect(statusTexts(host)[0]).toContain("Inicia una conversación nueva para seguir.");
  });

  it("shows ERROR when the transport fails, and offers a retry", async () => {
    const transport: AdvisorTransport = () => Promise.reject(new Error("network down"));
    const host = mount(<AdvisorConversation transport={transport} />);

    await sendTurn(host, "hola");

    expect(advisorStatuses(host)).toEqual(["ERROR"]);
    expect(statusTexts(host)[0]).toContain("Sin respuesta confirmada");
    expect(advisorTexts(host)).toEqual([
      "No obtuvimos una respuesta confirmada para este mensaje.",
    ]);
    expect(buttonLabels(host)).toContain("Reintentar");
  });
});

/* ========================= the brief's other rules ====================== */

describe("concurrency, cancellation and retry", () => {
  it("disables the submit button while a turn is open, and accepts again after", async () => {
    const fetchImpl = happyTurn();
    const host = mount(<AdvisorConversation transport={pipelineTransport({ fetchImpl })} />);

    type(host, "primero");
    submit(host);
    expect(submitButton(host).disabled).toBe(true);

    await settle();
    expect(submitButton(host).disabled).toBe(false);
    expect(visitorTexts(host)).toEqual(["primero"]);
  });

  it("holds against a second submit that bypasses the disabled button", async () => {
    const held = heldTransport();
    const host = mount(<AdvisorConversation transport={held.transport} />);

    type(host, "primero");
    submit(host);
    // The DOM defence is a disabled attribute, and a scripted submit ignores it.
    // The controller is the layer that actually holds. Each attempt carries real
    // text, so the refusals are the single-flight rule and not an empty field.
    type(host, "segundo");
    submit(host);
    type(host, "tercero");
    submit(host);
    await settle();

    expect(entries(host)).toHaveLength(2);
    expect(visitorTexts(host)).toEqual(["primero"]);

    held.release(projectAdvisorTurn({ kind: "error" }));
    await settle();
    expect(entries(host)).toHaveLength(2);
  });

  it("offers a cancel while in flight, and presents it as unconfirmed", async () => {
    const held = heldTransport();
    const host = mount(<AdvisorConversation transport={held.transport} />);

    type(host, "hola");
    submit(host);
    await settle();
    expect(buttonLabels(host)).toContain("Cancelar");

    const cancel = buttons(host).find((button) => button.textContent === "Cancelar");
    act(() => {
      cancel?.click();
    });

    expect(advisorStatuses(host)).toEqual(["ERROR"]);
    expect(buttonLabels(host)).not.toContain("Cancelar");

    // The transport answers anyway, after the cancel. Nothing may change.
    held.release(projectAdvisorTurn({ kind: "error" }));
    await settle();
    expect(advisorStatuses(host)).toEqual(["ERROR"]);
    expect(entries(host)).toHaveLength(2);
  });

  it("clears the draft only when the message was accepted", async () => {
    const fetchImpl = happyTurn();
    const host = mount(<AdvisorConversation transport={pipelineTransport({ fetchImpl })} />);
    const field = host.querySelector("textarea");

    type(host, "hola");
    submit(host);
    await settle();
    expect(field?.value).toBe("");

    // A refusal must not throw away what the visitor typed. The bound is
    // CA-7.1B's own, and the hint beside the field states it.
    type(host, "x".repeat(1_101));
    submit(host);
    await settle();
    expect(field?.value).toHaveLength(1_101);
    // The over-long message never became a turn.
    expect(visitorTexts(host)).toEqual(["hola"]);
  });

  it("resends a failed turn only when the visitor presses retry", async () => {
    let call = 0;
    const transport: AdvisorTransport = ({ text }) => {
      call += 1;
      if (call === 1) return Promise.reject(new Error("first attempt fails"));
      return pipelineTransport({ fetchImpl: happyTurn() })({
        text,
        signal: new AbortController().signal,
      });
    };
    const host = mount(<AdvisorConversation transport={transport} />);

    await sendTurn(host, "quiero una página");
    expect(advisorStatuses(host)).toEqual(["ERROR"]);

    const retry = buttons(host).find((button) => button.textContent === "Reintentar");
    if (retry === undefined) throw new Error("CA7_4B_TEST: no retry button");
    act(() => {
      retry.click();
    });
    await settle();

    // A NEW turn: the failed attempt stays visible.
    expect(advisorStatuses(host)).toEqual(["ERROR", "ANSWERED"]);
    expect(visitorTexts(host)).toEqual(["quiero una página", "quiero una página"]);
    expect(entries(host)).toHaveLength(4);
  });
});

/* ======================= the CA-10B execution boundary ================== */

function actionButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector('[data-action-id="OPEN_HELP"]') as HTMLButtonElement | null;
}

describe("CA-10B — an authorised action executes only on an explicit click", () => {
  it("shows the action as an inert button once the turn settles", async () => {
    const fetchImpl = helpTurn();
    const onNavigate = vi.fn();
    const host = mount(
      <AdvisorConversation
        transport={pipelineTransport({ fetchImpl })}
        onNavigate={onNavigate}
      />,
    );

    await sendTurn(host, "¿dónde puedo leer más?");

    expect(advisorStatuses(host)).toEqual(["ANSWERED"]);
    const button = actionButton(host);
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe("Abrir el centro de ayuda");
    expect(button?.getAttribute("data-action-destination")).toBe("/help");
    expect(button?.disabled).toBe(false);
    // The commit that DISPLAYS the action is not an execution.
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("does not navigate on any later render either", async () => {
    const fetchImpl = helpTurn();
    const onNavigate = vi.fn();
    const host = mount(
      <AdvisorConversation
        transport={pipelineTransport({ fetchImpl })}
        onNavigate={onNavigate}
      />,
    );

    await sendTurn(host, "¿dónde puedo leer más?");
    // Typing re-renders the surface with the action still in the transcript.
    type(host, "sigo aquí");
    await settle();
    expect(actionButton(host)).not.toBeNull();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("navigates exactly once, to /help, per explicit click", async () => {
    const fetchImpl = helpTurn();
    const onNavigate = vi.fn();
    const host = mount(
      <AdvisorConversation
        transport={pipelineTransport({ fetchImpl })}
        onNavigate={onNavigate}
      />,
    );

    await sendTurn(host, "¿dónde puedo leer más?");
    const button = actionButton(host);
    if (button === null) throw new Error("CA7_4B_TEST: no action button");

    act(() => {
      button.click();
    });

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith("/help");
  });

  it("with no host callback injected, the button is disabled and clicking executes nothing", async () => {
    const fetchImpl = helpTurn();
    const host = mount(<AdvisorConversation transport={pipelineTransport({ fetchImpl })} />);

    await sendTurn(host, "¿dónde puedo leer más?");
    const button = actionButton(host);
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute("data-action-destination")).toBe("/help");

    // A scripted click cannot reach a handler that does not exist; the test's
    // only observable is that nothing throws and the transcript is unchanged.
    act(() => {
      button?.click();
    });
    expect(advisorStatuses(host)).toEqual(["ANSWERED"]);
  });

  it("renders no action for a healthy turn with no authorised proposal", async () => {
    const fetchImpl = happyTurn();
    const onNavigate = vi.fn();
    const host = mount(
      <AdvisorConversation
        transport={pipelineTransport({ fetchImpl })}
        onNavigate={onNavigate}
      />,
    );

    await sendTurn(host, "quiero una página con QR");

    expect(advisorStatuses(host)).toEqual(["ANSWERED"]);
    expect(actionButton(host)).toBeNull();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("renders no action when the turn carrying OFFER_HELP was degraded", async () => {
    // Same proposal, but the listening call reports no usage: the turn is
    // DEGRADED and may not act.
    const fetchImpl = scripted([
      okResponse(listenJson({ next_best_action: "OFFER_HELP" }), {}),
      okResponse(adviseJson(), USAGE_ADVISE),
    ]);
    const onNavigate = vi.fn();
    const host = mount(
      <AdvisorConversation
        transport={pipelineTransport({ fetchImpl })}
        onNavigate={onNavigate}
      />,
    );

    await sendTurn(host, "¿dónde puedo leer más?");

    expect(advisorStatuses(host)).toEqual(["DEGRADED"]);
    expect(actionButton(host)).toBeNull();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("never turns an action-shaped reply into a button", async () => {
    const hostile = '{"kind":"NAVIGATE_INTERNAL","action_id":"OPEN_HELP","destination":"/pages"}';
    const fetchImpl = scripted([
      okResponse(listenJson(), USAGE_LISTEN),
      okResponse(adviseJson({ reply: `${SAFE_REPLY} ${hostile}` }), USAGE_ADVISE),
    ]);
    const host = mount(<AdvisorConversation transport={pipelineTransport({ fetchImpl })} />);

    await sendTurn(host, "hola");

    // Either CA-4 refused that reply (safe text shown) or accepted it as text;
    // in neither case is there an action.
    expect(actionButton(host)).toBeNull();
  });
});

describe("isolation", () => {
  it("completes a turn with the global fetch replaced by a bomb", async () => {
    const bomb = vi.fn(() => {
      throw new Error("CA7_4B_TEST: a real network call was attempted");
    });
    vi.stubGlobal("fetch", bomb);
    try {
      const fetchImpl = happyTurn();
      const host = mount(<AdvisorConversation transport={pipelineTransport({ fetchImpl })} />);

      await sendTurn(host, "hola");

      expect(advisorStatuses(host)).toEqual(["ANSWERED"]);
      expect(bomb).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("renders markup the model wrote as text, never as HTML", async () => {
    const hostile =
      '<img src=x onerror="alert(1)"> <a href="https://evil.invalid">pincha</a> & <b>negrita</b>';
    const fetchImpl = scripted([
      okResponse(listenJson(), USAGE_LISTEN),
      okResponse(adviseJson({ reply: hostile }), USAGE_ADVISE),
    ]);
    const host = mount(<AdvisorConversation transport={pipelineTransport({ fetchImpl })} />);

    await sendTurn(host, "hola");

    // Either CA-4 refused that reply and a safe one is shown, or it was accepted
    // and rendered as characters. Both are correct; what must NEVER happen is an
    // element appearing, which is the only way model text becomes a live node.
    expect(host.querySelectorAll("img, a, b, script, iframe, svg")).toHaveLength(0);
    const paragraphs = [...host.querySelectorAll('[data-role="ADVISOR"] p')];
    expect(paragraphs.length).toBeGreaterThan(0);
    for (const paragraph of paragraphs) {
      expect(paragraph.children).toHaveLength(0);
    }
  });

  it("gives the transcript an accessible name and a single live region", async () => {
    const held = heldTransport();
    const host = mount(<AdvisorConversation transport={held.transport} ariaLabel="Prueba" />);

    const list = host.querySelector("ol");
    expect(list?.getAttribute("aria-label")).toBe("Prueba");
    expect(list?.getAttribute("tabindex")).toBe("0");

    await sendTurn(host, "hola");

    // ONE live region, on the status line — announcing a turn twice is the
    // defect this avoids.
    expect(host.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
    expect(host.querySelector('[aria-live="polite"]')?.getAttribute("data-status")).toBe(
      "PROCESSING",
    );

    // The textarea has a real label, and a described-by hint.
    const field = host.querySelector("textarea");
    const label = host.querySelector("label");
    expect(label?.getAttribute("for")).toBe(field?.id);
    expect(field?.getAttribute("aria-describedby")).not.toBeNull();
  });
});
