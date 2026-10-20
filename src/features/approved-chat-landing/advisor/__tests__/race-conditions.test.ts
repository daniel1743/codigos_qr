/**
 * CRIPQER Conversion Advisor — CA-12 · races at the landing's edge.
 *
 * WHAT IS ALREADY PROVED ELSEWHERE, and deliberately not repeated here:
 * `conversation-controller.test.ts` proves the controller's single-flight,
 * token and dispose rules; `transport.test.ts` proves one session per transport
 * and its abort/timeout; `landing-product-e2e.test.tsx` presses Enter twice in a
 * real mounted tree; `browser-e2e.test.tsx` covers cancel, remount and two
 * conversations on one page. This file covers the seams BETWEEN those layers —
 * the combinations a visitor can cause with two windows, a double keypress or a
 * navigation while the provider is still thinking:
 *
 *   1. two independent contexts create two sessions and never meet;
 *   2. a double submit (Enter + Enter, or button + Enter) yields ONE turn;
 *   3. navigating away mid-turn aborts the old transport, and a remount opens a
 *      NEW conversation instead of inheriting the abandoned one;
 *   4. a response that lands after unmount writes no state and notifies nobody;
 *   5. one conversation's held turn never contaminates another's.
 *
 * ZERO REAL CALLS: every binding here is scripted; nothing reaches a provider,
 * a server function or `fetch`.
 */

import { describe, expect, it, vi } from "vitest";

import {
  ADVISOR_UI_CONTRACT_VERSION,
  ADVISOR_UI_NOTICE_TEXTS,
  validateAdvisorUiResponse,
  type AdvisorSettledProjection,
} from "../../../../lib/conversion-advisor/integration/ui-contract";
import { createAdvisorConversation } from "../../../../lib/conversion-advisor/ui/conversation-controller";
import { createLandingAdvisorTransport, type LandingAdvisorBindings } from "../transport";

/* ============================== fixtures ================================ */

/** A settled ANSWERED projection, checked by the contract's own validator. */
function answered(message: string): AdvisorSettledProjection {
  const value: AdvisorSettledProjection = {
    version: ADVISOR_UI_CONTRACT_VERSION,
    status: "ANSWERED",
    message,
    notice: null,
    actions: [],
    conversation: { turns_used: 1, turns_remaining: 49 },
  };
  const validation = validateAdvisorUiResponse(value);
  if (!validation.ok) {
    throw new Error(`CA12_TEST: invalid fixture — ${validation.problems.join(", ")}`);
  }
  return value;
}

/** Drains the controller's `Promise.resolve().then(...)` chain and its awaits. */
const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

interface HeldTurn {
  readonly sessionId: string;
  readonly message: string;
  readonly resolve: (value: unknown) => void;
}

/**
 * A scripted backend that assigns session ids monotonically and HOLDS every
 * turn until the test settles it. Holding is what makes the in-flight window
 * observable: an unmount, a second window or a late answer can only be tested
 * while the provider is genuinely pending.
 */
function heldBackend() {
  const sessions: string[] = [];
  const turns: HeldTurn[] = [];
  let counter = 0;

  const bindings: LandingAdvisorBindings = {
    startSession: async () => {
      counter += 1;
      const sessionId = `session-${counter}`;
      sessions.push(sessionId);
      return { session_id: sessionId };
    },
    askTurn: (input) =>
      new Promise<unknown>((resolve) => {
        turns.push({ sessionId: input.sessionId, message: input.message, resolve });
      }),
  };

  return {
    bindings,
    sessions,
    turns,
    settleLatest: (value: unknown): void => {
      const turn = turns[turns.length - 1];
      if (turn === undefined) throw new Error("CA12_TEST: no held turn");
      turn.resolve(value);
    },
  };
}

/** A backend that answers immediately, for the paths that are not about holds. */
function immediateBackend() {
  const sessions: string[] = [];
  const turns: { sessionId: string; message: string }[] = [];
  let counter = 0;
  const bindings: LandingAdvisorBindings = {
    startSession: async () => {
      counter += 1;
      const sessionId = `session-${counter}`;
      sessions.push(sessionId);
      return { session_id: sessionId };
    },
    askTurn: async (input) => {
      turns.push(input);
      return answered(`respuesta para ${input.message}`);
    },
  };
  return { bindings, sessions, turns };
}

function visitorTexts(conversation: ReturnType<typeof createAdvisorConversation>): string[] {
  return conversation
    .getState()
    .entries.filter((entry) => entry.role === "VISITOR")
    .map((entry) => entry.text);
}

function statuses(conversation: ReturnType<typeof createAdvisorConversation>): string[] {
  return conversation
    .getState()
    .entries.map((entry) => (entry.role === "ADVISOR" ? entry.response.status : "VISITOR"));
}

describe("CA-12 — races the landing must survive", () => {
  it("1 · two independent contexts create two sessions and never share a turn", async () => {
    const backend = immediateBackend();
    // Two bindings objects: what two browser contexts look like at this layer —
    // separate transports, separate conversations, one backend.
    const contextA = createAdvisorConversation({
      transport: createLandingAdvisorTransport({ ...backend.bindings }),
    });
    const contextB = createAdvisorConversation({
      transport: createLandingAdvisorTransport({ ...backend.bindings }),
    });

    expect(contextA.send("consulta de A").accepted).toBe(true);
    expect(contextB.send("consulta de B").accepted).toBe(true);
    await flush();
    await flush();

    expect(statuses(contextA)).toEqual(["VISITOR", "ANSWERED"]);
    expect(statuses(contextB)).toEqual(["VISITOR", "ANSWERED"]);

    expect(backend.sessions).toEqual(["session-1", "session-2"]);
    expect(backend.turns).toEqual([
      { sessionId: "session-1", message: "consulta de A" },
      { sessionId: "session-2", message: "consulta de B" },
    ]);
    // Neither context received the other's text.
    expect(visitorTexts(contextA)).toEqual(["consulta de A"]);
    expect(visitorTexts(contextB)).toEqual(["consulta de B"]);
  });

  it("2 · a double submit produces exactly one turn and one transport call", async () => {
    const backend = immediateBackend();
    const conversation = createAdvisorConversation({
      transport: createLandingAdvisorTransport({ ...backend.bindings }),
    });

    // Enter twice, or the button and Enter in the same tick: both reach `send`
    // before the first transport settles. The second must be refused as
    // IN_FLIGHT — not queued, not dropped silently, not sent twice.
    const first = conversation.send("¿Cuánto cuesta?");
    const second = conversation.send("¿Cuánto cuesta?");

    expect(first).toEqual({ accepted: true, reason: "ACCEPTED" });
    expect(second).toEqual({ accepted: false, reason: "IN_FLIGHT" });

    await flush();
    await flush();

    expect(backend.turns).toHaveLength(1);
    expect(statuses(conversation)).toEqual(["VISITOR", "ANSWERED"]);
    expect(conversation.getState().inFlightAdvisorId).toBeNull();
  });

  it("3 · navigating away mid-turn aborts the old transport and a remount opens a new conversation", async () => {
    const backend = heldBackend();

    // The landing that is left behind.
    const before = createAdvisorConversation({
      transport: createLandingAdvisorTransport({ ...backend.bindings }),
    });
    before.send("hola, sigo aquí");
    await flush();
    expect(backend.turns).toHaveLength(1);
    const abandoned = backend.turns[0];
    expect(abandoned?.sessionId).toBe("session-1");

    // The visitor navigates away: the surface unmounts and aborts its turn.
    before.abort();
    const beforeState = before.getState();

    // The abandoned answer arrives late. It must not be applied.
    abandoned?.resolve(answered("respuesta abandonada"));
    await flush();
    expect(before.getState()).toBe(beforeState);

    // The visitor comes back: a new mount, a new transport, a new session.
    const after = createAdvisorConversation({
      transport: createLandingAdvisorTransport({ ...backend.bindings }),
    });
    expect(after.send("hola, volví").accepted).toBe(true);
    await flush();
    await flush();

    expect(backend.turns).toHaveLength(2);
    expect(backend.turns[1]?.sessionId).toBe("session-2");
    expect(backend.sessions).toEqual(["session-1", "session-2"]);

    backend.turns[1]?.resolve(answered("respuesta nueva"));
    await flush();

    expect(statuses(after)).toEqual(["VISITOR", "ANSWERED"]);
    expect(visitorTexts(after)).toEqual(["hola, volví"]);
    // The abandoned conversation never saw the new turn either.
    expect(visitorTexts(before)).toEqual(["hola, sigo aquí"]);
    expect(before.getState()).toBe(beforeState);
  });

  it("4 · a response after unmount writes no state and notifies no listener", async () => {
    const backend = heldBackend();
    const conversation = createAdvisorConversation({
      transport: createLandingAdvisorTransport({ ...backend.bindings }),
    });
    const listener = vi.fn();
    conversation.subscribe(listener);

    conversation.send("hola");
    await flush();
    expect(backend.turns).toHaveLength(1);

    const inFlight = conversation.getState();
    listener.mockClear();

    // Unmount: `abort()` — the unmount path — not `cancel()`.
    conversation.abort();
    expect(backend.turns[0]?.resolve).toBeTypeOf("function");

    backend.settleLatest(answered("llego tarde"));
    await flush();

    expect(conversation.getState()).toBe(inFlight);
    expect(listener).not.toHaveBeenCalled();
    // The pending entry is still visible in the abandoned controller, but no
    // state update happened after unmount — the zero the brief requires.
    expect(statuses(conversation)).toEqual(["VISITOR", "PROCESSING"]);
  });

  it("5 · one conversation's held turn never contaminates another's", async () => {
    const backend = heldBackend();
    const slow = createAdvisorConversation({
      transport: createLandingAdvisorTransport({ ...backend.bindings }),
    });
    const fast = createAdvisorConversation({
      transport: createLandingAdvisorTransport({ ...backend.bindings }),
    });

    slow.send("consulta lenta");
    fast.send("consulta rápida");
    await flush();

    expect(backend.turns.map((turn) => turn.message)).toEqual([
      "consulta lenta",
      "consulta rápida",
    ]);
    // The second conversation has its own session and its own pending turn.
    expect(backend.turns[1]?.sessionId).toBe("session-2");

    backend.turns[1]?.resolve(answered("rápida"));
    await flush();
    expect(statuses(fast)).toEqual(["VISITOR", "ANSWERED"]);
    expect(statuses(slow)).toEqual(["VISITOR", "PROCESSING"]);

    backend.turns[0]?.resolve(answered("lenta"));
    await flush();
    expect(statuses(slow)).toEqual(["VISITOR", "ANSWERED"]);

    // Each transcript holds only its own text.
    expect(visitorTexts(slow)).toEqual(["consulta lenta"]);
    expect(visitorTexts(fast)).toEqual(["consulta rápida"]);
  });
});
