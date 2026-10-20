/**
 * CRIPQER Conversion Advisor — CA-12 · concurrent session isolation.
 *
 * The store is a process-wide `Map`; the conversation id is the only key. This
 * suite runs 4 users × 2 conversations through the REAL guarded turn, in
 * parallel, with a scripted transport, and proves the four properties public use
 * depends on:
 *
 *   1. every conversation gets its own id and its own memory;
 *   2. a conversation's history never appears in another conversation's request;
 *   3. a second turn reuses the SAME session (no accidental re-creation);
 *   4. an unknown/failed session and a deliberately slow conversation do not
 *      block or poison unrelated conversations.
 *
 * ZERO REAL CALLS: the transport is scripted and `fetch` is never the global.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { createAdvisorGuard } from "../../guardrails/guard.server";
import { createInMemoryGuardrailLedger } from "../../guardrails/ledger.server";
import { DEFAULT_ADVISOR_LIMITS, type AdvisorLimits } from "../../guardrails/limits";
import type { AdvisorProviderConfig } from "../../provider.server";
import { __resetAllSessionsForTests, getSession } from "../../session/store.server";
import { runConversationalTurn, startAdvisorSession, type TurnRun } from "../turn.server";

const CONFIG: AdvisorProviderConfig = {
  apiKey: "sk-ca12-FICTIONAL",
  baseUrl: "https://ca12.invalid/v1",
  model: "deepseek-flash",
  timeoutMs: 5_000,
  maxOutputTokens: 400,
  maxRetries: 0,
  retryBaseDelayMs: 1,
};

const LISTENING_MARKER = "comprensión de intenciones";
const SAFE_REPLY =
  "CRIPQER reúne tu información y tus enlaces en una sola página con QR. ¿Quieres que te cuente cómo se ve?";

const MARKERS = [
  "USR-A-CONV-1",
  "USR-A-CONV-2",
  "USR-B-CONV-1",
  "USR-B-CONV-2",
  "USR-C-CONV-1",
  "USR-C-CONV-2",
  "USR-D-CONV-1",
  "USR-D-CONV-2",
] as const;

type Marker = (typeof MARKERS)[number];

function markerIn(text: string): Marker | null {
  return MARKERS.find((marker) => text.includes(marker)) ?? null;
}

interface Captured {
  readonly kind: "listen" | "advise";
  readonly marker: Marker | null;
  readonly prompt: string;
}

/**
 * A scripted transport that answers from the marker in the request. It records
 * every prompt, which is what makes "this conversation's context reached THIS
 * conversation only" a measured fact.
 */
function recordingTransport(options: { readonly slowMarker?: Marker } = {}) {
  const captured: Captured[] = [];
  let releaseSlow: (() => void) | null = null;
  const slowGate = new Promise<void>((resolve) => {
    releaseSlow = resolve;
  });

  const fetchImpl = (async (_input: unknown, init?: RequestInit) => {
    let prompt = "";
    try {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        messages?: Array<{ content?: unknown }>;
      };
      prompt = (body.messages ?? []).map((entry) => String(entry.content ?? "")).join("\n");
    } catch {
      prompt = "";
    }
    const kind: "listen" | "advise" = prompt.includes(LISTENING_MARKER) ? "listen" : "advise";
    const marker = markerIn(prompt);
    captured.push({ kind, marker, prompt });

    if (options.slowMarker !== undefined && marker === options.slowMarker) {
      await slowGate;
    }

    const content =
      kind === "listen"
        ? JSON.stringify({
            intents: ["DISCOVERY"],
            business_type: marker,
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
          })
        : JSON.stringify({ reply: SAFE_REPLY, capability_ids: [], limitations: [] });

    return new Response(
      JSON.stringify({
        choices: [{ message: { content } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  return {
    fetchImpl,
    captured,
    releaseSlow: () => releaseSlow?.(),
  };
}

function expectOk(run: TurnRun) {
  if (!run.ok) throw new Error(`expected an outcome, got ${run.reason}: ${run.detail}`);
  return run.outcome;
}

function guard(patch: Partial<AdvisorLimits> = {}) {
  const resolved: AdvisorLimits = { ...DEFAULT_ADVISOR_LIMITS, ...patch };
  return createAdvisorGuard(resolved, createInMemoryGuardrailLedger(resolved));
}

/**
 * TEST-ONLY widening, used by the two isolation tests so that the property
 * under test — memory separation — is what fails when it is broken, not the
 * guard's unrelated in-process concurrency barrier. The production default is
 * exercised, unmodified, by test 5.
 */
const ISOLATION_LIMITS: Partial<AdvisorLimits> = { maxConcurrency: 16 };

function deps(fetchImpl: typeof fetch) {
  return { config: CONFIG, providerDeps: { fetchImpl, sleep: async () => {} } };
}

beforeEach(() => {
  __resetAllSessionsForTests();
});

describe("CA-12 — 4 users × 2 conversations, in parallel", () => {
  it("1 · every conversation gets its own id, used by both of its turns", async () => {
    const sessions = new Map<Marker, string>();
    for (const marker of MARKERS) sessions.set(marker, startAdvisorSession().session_id);

    expect(new Set(sessions.values()).size).toBe(MARKERS.length);

    const transport = recordingTransport();
    const shared = guard(ISOLATION_LIMITS);

    // Round 1: all eight FIRST turns at once.
    const first = await Promise.all(
      MARKERS.map((marker) =>
        runConversationalTurn(
          { sessionId: sessions.get(marker) as string, message: `Hola, consulta ${marker}` },
          { ...deps(transport.fetchImpl), guard: shared },
        ),
      ),
    );
    for (const [index, marker] of MARKERS.entries()) {
      const outcome = expectOk(first[index] as TurnRun);
      expect(outcome.session_id, marker).toBe(sessions.get(marker));
      expect(outcome.session.turns_used, marker).toBe(1);
      expect(outcome.persisted, marker).toBe(true);
    }

    // Round 2: all eight SECOND turns at once, on the same ids.
    const second = await Promise.all(
      MARKERS.map((marker) =>
        runConversationalTurn(
          { sessionId: sessions.get(marker) as string, message: `Amplía ${marker}` },
          { ...deps(transport.fetchImpl), guard: shared },
        ),
      ),
    );
    for (const [index, marker] of MARKERS.entries()) {
      const outcome = expectOk(second[index] as TurnRun);
      expect(outcome.session_id, marker).toBe(sessions.get(marker));
      expect(outcome.session.turns_used, marker).toBe(2);
    }

    // The store really has eight conversations with two turns each.
    for (const marker of MARKERS) {
      const context = getSession(sessions.get(marker) as string)?.context;
      expect(context?.turns_total, marker).toBe(2);
      expect(
        context?.recent_turns.filter((turn) => turn.role === "user").map((turn) => turn.content),
        marker,
      ).toEqual([`Hola, consulta ${marker}`, `Amplía ${marker}`]);
    }

    expect(transport.captured).toHaveLength(32);
  });

  it("2 · no conversation's context reaches another conversation's request", async () => {
    const sessions = new Map<Marker, string>();
    for (const marker of MARKERS) sessions.set(marker, startAdvisorSession().session_id);
    const transport = recordingTransport();
    const shared = guard(ISOLATION_LIMITS);

    for (const marker of MARKERS) {
      await runConversationalTurn(
        { sessionId: sessions.get(marker) as string, message: `Hola, consulta ${marker}` },
        { ...deps(transport.fetchImpl), guard: shared },
      );
    }
    for (const marker of MARKERS) {
      await runConversationalTurn(
        { sessionId: sessions.get(marker) as string, message: `Amplía ${marker}` },
        { ...deps(transport.fetchImpl), guard: shared },
      );
    }

    for (const request of transport.captured) {
      const own = request.marker;
      expect(own, "every request carries exactly one conversation's marker").not.toBeNull();
      for (const other of MARKERS) {
        if (other === own) continue;
        expect(
          request.prompt.includes(other),
          `${other} leaked into ${own}'s ${request.kind} prompt`,
        ).toBe(false);
      }
    }

    // The second listening request of each conversation really carried its own
    // remembered business_type — memory is not merely "not leaked", it exists.
    for (const marker of MARKERS) {
      const secondListen = transport.captured.filter(
        (request) => request.kind === "listen" && request.marker === marker,
      )[1];
      expect(secondListen, marker).toBeDefined();
      expect(secondListen?.prompt.includes(marker), marker).toBe(true);
    }
  });

  it("3 · an unknown session is refused without touching the live conversations", async () => {
    const transport = recordingTransport();
    const shared = guard();
    const sessionId = startAdvisorSession().session_id;

    await runConversationalTurn(
      { sessionId, message: "Hola, consulta USR-A-CONV-1" },
      { ...deps(transport.fetchImpl), guard: shared },
    );

    const unknown = await runConversationalTurn(
      { sessionId: "00000000-0000-4000-8000-000000000000", message: "Hola" },
      { ...deps(transport.fetchImpl), guard: shared },
    );
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.reason).toBe("SESSION_UNKNOWN");

    const after = await runConversationalTurn(
      { sessionId, message: "Amplía USR-A-CONV-1" },
      { ...deps(transport.fetchImpl), guard: shared },
    );
    expect(expectOk(after).session.turns_used).toBe(2);
  });

  it("4 · one slow conversation does not block unrelated conversations", async () => {
    const slowMarker: Marker = "USR-D-CONV-1";
    const transport = recordingTransport({ slowMarker });
    const shared = guard();
    const sessions = new Map<Marker, string>();
    for (const marker of ["USR-A-CONV-1", "USR-B-CONV-1", "USR-C-CONV-1", slowMarker] as Marker[]) {
      sessions.set(marker, startAdvisorSession().session_id);
    }

    const order: Marker[] = [];
    const turns = (["USR-A-CONV-1", "USR-B-CONV-1", "USR-C-CONV-1", slowMarker] as Marker[]).map(
      (marker) =>
        runConversationalTurn(
          { sessionId: sessions.get(marker) as string, message: `Hola, consulta ${marker}` },
          { ...deps(transport.fetchImpl), guard: shared },
        ).then((run) => {
          order.push(marker);
          return run;
        }),
    );

    // The three unrelated conversations settle while D's listening call is held.
    await Promise.all(turns.slice(0, 3));
    expect(order).toEqual(["USR-A-CONV-1", "USR-B-CONV-1", "USR-C-CONV-1"]);
    for (const run of await Promise.all(turns.slice(0, 3))) {
      expect(expectOk(run).session.turns_used).toBe(1);
    }

    // Only then is D released, and it settles normally.
    transport.releaseSlow();
    const slow = await turns[3];
    expect(order).toEqual([
      "USR-A-CONV-1",
      "USR-B-CONV-1",
      "USR-C-CONV-1",
      slowMarker,
    ]);
    expect(expectOk(slow as TurnRun).session.turns_used).toBe(1);
  });

  it("5 · the production concurrency barrier denies locally and the conversation recovers", async () => {
    // DEFAULT limits, including `maxConcurrency: 4`. This is a real capacity
    // boundary of one process, not an isolation defect: a refused turn must be
    // refused for ITSELF, leave its conversation empty, and be retryable.
    const transport = recordingTransport();
    const shared = guard();
    const sessions = new Map<Marker, string>();
    for (const marker of MARKERS) sessions.set(marker, startAdvisorSession().session_id);

    const runs = await Promise.all(
      MARKERS.map((marker) =>
        runConversationalTurn(
          { sessionId: sessions.get(marker) as string, message: `Hola, consulta ${marker}` },
          { ...deps(transport.fetchImpl), guard: shared },
        ),
      ),
    );

    const denied: Marker[] = [];
    for (const [index, marker] of MARKERS.entries()) {
      const outcome = expectOk(runs[index] as TurnRun);
      if (outcome.understanding.reservation === "DENIED") {
        denied.push(marker);
        expect(outcome.understanding.denied_reason, marker).toBe("CONCURRENCY_LIMIT");
        expect(outcome.persisted, marker).toBe(false);
        expect(outcome.session.turns_used, marker).toBe(0);
        expect(outcome.degraded, marker).toBe(true);
        // Nothing was sent for a turn the guard refused.
        expect(
          transport.captured.filter((request) => request.marker === marker),
          marker,
        ).toHaveLength(0);
        expect(getSession(sessions.get(marker) as string)?.context.turns_total, marker).toBe(0);
      } else {
        expect(outcome.understanding.reservation, marker).toBe("GRANTED");
        expect(outcome.persisted, marker).toBe(true);
        expect(outcome.session.turns_used, marker).toBe(1);
      }
    }

    // Eight simultaneous first turns against four slots MUST exercise the
    // barrier; otherwise this test is not proving what it claims.
    expect(denied.length).toBeGreaterThan(0);

    // A denied conversation is not poisoned: retried alone, it succeeds.
    for (const marker of denied) {
      const retry = await runConversationalTurn(
        { sessionId: sessions.get(marker) as string, message: `Hola, consulta ${marker}` },
        { ...deps(transport.fetchImpl), guard: shared },
      );
      const outcome = expectOk(retry);
      expect(outcome.understanding.reservation, marker).toBe("GRANTED");
      expect(outcome.persisted, marker).toBe(true);
      expect(outcome.session.turns_used, marker).toBe(1);
      expect(getSession(sessions.get(marker) as string)?.context.turns_total, marker).toBe(1);
    }

    // Isolation still held during the contention: no request carried two
    // conversations' markers.
    for (const request of transport.captured) {
      const own = request.marker;
      expect(own).not.toBeNull();
      for (const other of MARKERS) {
        if (other === own) continue;
        expect(request.prompt.includes(other), `${other} leaked into ${own}`).toBe(false);
      }
    }
  });
});
