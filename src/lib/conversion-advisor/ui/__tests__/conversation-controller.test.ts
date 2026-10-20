/**
 * CRIPQER Conversion Advisor — CA-7.4-B · the conversation controller's rules.
 *
 * Plain Node: no DOM, no React, nothing but a microtask flush. The controller is
 * React-free on purpose, so every rule the brief names — validating a public
 * response, one request at a time, dropping out-of-order results, never
 * presenting a cancellation as a success, never retrying on its own — is proved
 * here as a statement about VALUES rather than about a rendered tree.
 *
 * ONE HABIT THIS FILE HAS TO KEEP. The transport is invoked on a MICROTASK
 * (`Promise.resolve().then(...)`), deliberately, so that a transport which throws
 * synchronously lands on the same rejection path as one that rejects. The
 * consequence for the tests is that anything about what the transport RECEIVED —
 * its calls, its text, its signal — is asserted only AFTER a `flush()`. An
 * assertion read before the flush would find an empty call list and pass or fail
 * for the wrong reason.
 *
 * WHY THERE ARE LITERAL RESPONSES IN THIS FILE. The controller's contract is
 * "accept exactly what CA-7.4-A's validator accepts", so a test of that contract
 * needs values on both sides of the boundary. Every literal below is pushed
 * through `validateAdvisorUiResponse` in the factory that builds it — a fixture
 * that drifted from the contract fails here instead of quietly testing a shape
 * that cannot exist — and none of them is a fabricated advisor reply: nothing in
 * this file is rendered, shipped or shown to anyone.
 */

import { describe, expect, it, vi } from "vitest";

import { TURN_LIMITS } from "../../integration/contract";
import {
  ADVISOR_UI_CONTRACT_VERSION,
  ADVISOR_UI_NOTICE_TEXTS,
  validateAdvisorUiResponse,
  type AdvisorSettledProjection,
  type AdvisorUiConversation,
  type AdvisorUiNoticeCode,
} from "../../integration/ui-contract";
import { pendingAdvisorTurn, projectAdvisorTurn } from "../../integration/ui-projection";
import {
  conversationReducer,
  createAdvisorConversation,
  type AdvisorConversation,
  type SendOutcome,
  type SendRefusal,
} from "../conversation-controller";
import {
  EMPTY_CONVERSATION,
  type AdvisorEntry,
  type AdvisorTransport,
  type AdvisorTransportInput,
  type ConversationEntry,
  type ConversationState,
  type VisitorEntry,
} from "../types";

/* ============================== fixtures ================================ */

const CONVERSATION: AdvisorUiConversation = { turns_used: 1, turns_remaining: 49 };

/**
 * A settled response, built as a literal and checked by the contract's OWN
 * validator before it is handed to anything. The `throw` is what makes the claim
 * below it true rather than hopeful.
 */
function settled(
  status: AdvisorSettledProjection["status"],
  message: string,
  noticeCode: AdvisorUiNoticeCode | null,
  conversation: AdvisorUiConversation | null = null,
): AdvisorSettledProjection {
  const value = {
    version: ADVISOR_UI_CONTRACT_VERSION,
    status,
    message,
    notice:
      noticeCode === null ? null : { code: noticeCode, text: ADVISOR_UI_NOTICE_TEXTS[noticeCode] },
    actions: [],
    conversation,
  };
  const validation = validateAdvisorUiResponse(value);
  if (!validation.ok) {
    throw new Error(`CA7_4B_TEST: invalid fixture — ${validation.problems.join(", ")}`);
  }
  return value;
}

const ANSWERED = (): AdvisorSettledProjection =>
  settled("ANSWERED", "Respuesta verificada del asesor.", null, CONVERSATION);

const ERROR_RESPONSE = (): AdvisorSettledProjection => projectAdvisorTurn({ kind: "error" });

const VISITOR: VisitorEntry = { id: "v", role: "VISITOR", text: "hola" };

/** A turn in flight, produced by CA-7.4-A's own client-local entry point. */
const ADVISOR_PENDING: AdvisorEntry = {
  id: "a",
  role: "ADVISOR",
  response: pendingAdvisorTurn(),
  retryText: "hola",
};

/** Lets the controller's `Promise.resolve().then(...)` chain run to completion. */
const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

function entryAt(state: ConversationState, index: number): ConversationEntry {
  const entry = state.entries[index];
  if (entry === undefined) throw new Error(`CA7_4B_TEST: no entry at ${index}`);
  return entry;
}

function advisorAt(state: ConversationState, index: number): AdvisorEntry {
  const entry = entryAt(state, index);
  if (entry.role !== "ADVISOR")
    throw new Error(`CA7_4B_TEST: entry ${index} is not an advisor turn`);
  return entry;
}

function statuses(state: ConversationState): readonly string[] {
  return state.entries.map((entry) =>
    entry.role === "ADVISOR" ? entry.response.status : "VISITOR",
  );
}

/** A transport that answers with one fixed value, recording what it was given. */
function fixedTransport(value: unknown): {
  readonly transport: AdvisorTransport;
  readonly calls: AdvisorTransportInput[];
} {
  const calls: AdvisorTransportInput[] = [];
  return {
    calls,
    transport: (input) => {
      calls.push(input);
      return Promise.resolve(value);
    },
  };
}

/**
 * A transport whose answers the test resolves by hand, so a turn can be held
 * open across other actions.
 *
 * The resolvers are kept PER CALL, not only for the latest one: the ordering
 * tests need to settle the FIRST turn after a second one has started, which is
 * exactly the situation the surface must survive. A helper that could only
 * release the newest call would make that test impossible to write honestly.
 */
function heldTransport(): {
  readonly transport: AdvisorTransport;
  readonly calls: AdvisorTransportInput[];
  readonly settleAt: (index: number, value: unknown) => void;
  readonly failAt: (index: number, reason: unknown) => void;
} {
  const calls: AdvisorTransportInput[] = [];
  const pending: Array<{
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }> = [];
  const transport: AdvisorTransport = (input) => {
    calls.push(input);
    return new Promise<unknown>((resolve, reject) => {
      pending.push({ resolve, reject });
    });
  };
  return {
    calls,
    transport,
    settleAt: (index, value) => pending[index]?.resolve(value),
    failAt: (index, reason) => pending[index]?.reject(reason),
  };
}

const sendOutcome = (conversation: AdvisorConversation, text: string): SendOutcome =>
  conversation.send(text);

const expectRefusal = (outcome: SendOutcome, reason: SendRefusal): void => {
  expect(outcome.accepted).toBe(false);
  expect(outcome.reason).toBe(reason);
};

/* =============================== reducer ================================ */

describe("conversationReducer", () => {
  it("appends the visitor's turn and the advisor's turn, and marks it in flight", () => {
    const next = conversationReducer(EMPTY_CONVERSATION, {
      type: "TURN_STARTED",
      visitor: VISITOR,
      advisor: ADVISOR_PENDING,
    });

    expect(next.entries).toHaveLength(2);
    expect(statuses(next)).toEqual(["VISITOR", "PROCESSING"]);
    expect(next.inFlightAdvisorId).toBe("a");
  });

  it("settles the turn in place and clears the in-flight marker", () => {
    const started = conversationReducer(EMPTY_CONVERSATION, {
      type: "TURN_STARTED",
      visitor: VISITOR,
      advisor: ADVISOR_PENDING,
    });
    const settledState = conversationReducer(started, {
      type: "TURN_SETTLED",
      advisorId: "a",
      response: ANSWERED(),
    });

    // The transcript keeps its shape: the pending turn becomes the settled one.
    expect(settledState.entries).toHaveLength(2);
    expect(statuses(settledState)).toEqual(["VISITOR", "ANSWERED"]);
    expect(settledState.inFlightAdvisorId).toBeNull();
  });

  it("drops a settle for a turn that is no longer in flight, by reference", () => {
    const started = conversationReducer(EMPTY_CONVERSATION, {
      type: "TURN_STARTED",
      visitor: VISITOR,
      advisor: ADVISOR_PENDING,
    });

    // A stale result must not merely be ignored — it must not look like a
    // change, because the surface re-renders on identity.
    const stale = conversationReducer(started, {
      type: "TURN_SETTLED",
      advisorId: "some-other-turn",
      response: ANSWERED(),
    });
    expect(stale).toBe(started);
  });

  it("never mutates the state it is given", () => {
    const started = conversationReducer(EMPTY_CONVERSATION, {
      type: "TURN_STARTED",
      visitor: VISITOR,
      advisor: ADVISOR_PENDING,
    });
    const snapshot = JSON.stringify(started);

    conversationReducer(started, { type: "TURN_SETTLED", advisorId: "a", response: ANSWERED() });

    expect(JSON.stringify(started)).toBe(snapshot);
  });
});

/* ============================ the boundaries ============================ */

describe("send — the bounds and the single-flight rule", () => {
  it("refuses empty and whitespace-only text without calling the transport", async () => {
    const { transport, calls } = fixedTransport(ANSWERED());
    const conversation = createAdvisorConversation({ transport });

    expectRefusal(sendOutcome(conversation, ""), "EMPTY");
    expectRefusal(sendOutcome(conversation, "   \n\t "), "EMPTY");

    await flush();
    expect(calls).toHaveLength(0);
    expect(conversation.getState()).toBe(EMPTY_CONVERSATION);
  });

  it("refuses text longer than CA-7.1B's own bound, and accepts exactly the bound", async () => {
    const { transport, calls } = fixedTransport(ANSWERED());
    const conversation = createAdvisorConversation({ transport });

    expect(conversation.maxMessageChars).toBe(TURN_LIMITS.maxMessageChars);

    const tooLong = "a".repeat(TURN_LIMITS.maxMessageChars + 1);
    expectRefusal(sendOutcome(conversation, tooLong), "TOO_LONG");
    await flush();
    expect(calls).toHaveLength(0);

    const atBound = "a".repeat(TURN_LIMITS.maxMessageChars);
    expect(sendOutcome(conversation, atBound).accepted).toBe(true);
    await flush();
    expect(calls).toHaveLength(1);
  });

  it("sends the trimmed text, so padding cannot smuggle a message past the bound", async () => {
    const { transport, calls } = fixedTransport(ANSWERED());
    const conversation = createAdvisorConversation({ transport });

    conversation.send("   hola   ");
    await flush();

    expect(calls[0]?.text).toBe("hola");
  });

  it("refuses a second send while one turn is in flight", async () => {
    const held = heldTransport();
    const conversation = createAdvisorConversation({ transport: held.transport });

    expect(sendOutcome(conversation, "primero").accepted).toBe(true);
    await flush();

    expectRefusal(sendOutcome(conversation, "segundo"), "IN_FLIGHT");
    await flush();

    expect(held.calls).toHaveLength(1);
    expect(conversation.getState().inFlightAdvisorId).not.toBeNull();
  });

  it("accepts again once the turn has settled", async () => {
    const { transport, calls } = fixedTransport(ANSWERED());
    const conversation = createAdvisorConversation({ transport });

    conversation.send("primero");
    await flush();
    expect(sendOutcome(conversation, "segundo").accepted).toBe(true);
    await flush();

    expect(calls).toHaveLength(2);
  });
});

/* ========================== the validation boundary ===================== */

describe("the transport boundary", () => {
  it("renders a response the contract's validator accepts, verbatim", async () => {
    const { transport } = fixedTransport(ANSWERED());
    const conversation = createAdvisorConversation({ transport });

    conversation.send("hola");
    await flush();

    const advisor = advisorAt(conversation.getState(), 1);
    expect(advisor.response).toEqual(ANSWERED());
    expect(conversation.getState().inFlightAdvisorId).toBeNull();
  });

  it("turns a payload with an unauthorised field into ERROR rather than rendering it", async () => {
    const smuggled = { ...ANSWERED(), session_id: "should-never-render" };
    const { transport } = fixedTransport(smuggled);
    const conversation = createAdvisorConversation({ transport });

    conversation.send("hola");
    await flush();

    const advisor = advisorAt(conversation.getState(), 1);
    expect(advisor.response.status).toBe("ERROR");
    expect(JSON.stringify(advisor.response)).not.toContain("should-never-render");
  });

  it.each([
    ["null", null],
    ["a string", "not a response"],
    ["a number", 42],
    ["an array", []],
    ["an empty object", {}],
    ["a bad version", { ...ANSWERED(), version: 99 }],
    ["a bad status", { ...ANSWERED(), status: "DONE" }],
    ["an empty message", { ...ANSWERED(), message: "   " }],
    ["an action outside the closed shape", { ...ANSWERED(), actions: [{ kind: "NAVIGATE" }] }],
    ["a missing notice", { ...projectAdvisorTurn({ kind: "error" }), notice: null }],
    [
      "an unexpected notice",
      {
        ...ANSWERED(),
        notice: { code: "TURN_INCOMPLETE", text: ADVISOR_UI_NOTICE_TEXTS.TURN_INCOMPLETE },
      },
    ],
    [
      "a notice whose text was assembled",
      {
        ...projectAdvisorTurn({ kind: "error" }),
        notice: { code: "RESPONSE_UNCONFIRMED", text: "motivo: TIMEOUT" },
      },
    ],
  ])("turns %s into ERROR", async (_label, payload) => {
    const { transport } = fixedTransport(payload);
    const conversation = createAdvisorConversation({ transport });

    conversation.send("hola");
    await flush();

    expect(advisorAt(conversation.getState(), 1).response).toEqual(ERROR_RESPONSE());
  });

  it("turns a rejected transport into ERROR, carrying nothing from the rejection", async () => {
    const transport: AdvisorTransport = () =>
      Promise.reject(new Error("PROVIDER SAID: sk-live-LEAKED-KEY"));
    const conversation = createAdvisorConversation({ transport });

    conversation.send("hola");
    await flush();

    const advisor = advisorAt(conversation.getState(), 1);
    expect(advisor.response).toEqual(ERROR_RESPONSE());
    expect(JSON.stringify(advisor.response)).not.toContain("LEAKED-KEY");
  });

  it("turns a transport that throws SYNCHRONOUSLY into ERROR on the same path", async () => {
    const transport: AdvisorTransport = () => {
      throw new Error("sync failure");
    };
    const conversation = createAdvisorConversation({ transport });

    expect(() => conversation.send("hola")).not.toThrow();
    await flush();

    expect(advisorAt(conversation.getState(), 1).response).toEqual(ERROR_RESPONSE());
  });

  it("keeps the earlier turns when a later one fails", async () => {
    let call = 0;
    const transport: AdvisorTransport = () => {
      call += 1;
      return call === 1 ? Promise.resolve(ANSWERED()) : Promise.reject(new Error("boom"));
    };
    const conversation = createAdvisorConversation({ transport });

    conversation.send("primero");
    await flush();
    conversation.send("segundo");
    await flush();

    const state = conversation.getState();
    expect(state.entries).toHaveLength(4);
    expect(statuses(state)).toEqual(["VISITOR", "ANSWERED", "VISITOR", "ERROR"]);
  });
});

/* ============================ ordering ================================== */

describe("ordering and cancellation", () => {
  it("drops a late answer that arrives after the turn was cancelled", async () => {
    const held = heldTransport();
    const conversation = createAdvisorConversation({ transport: held.transport });

    conversation.send("hola");
    await flush();
    expect(conversation.cancel()).toBe(true);
    expect(statuses(conversation.getState())).toEqual(["VISITOR", "ERROR"]);

    // The transport answers anyway, after the cancel. Nothing may change.
    held.settleAt(0, ANSWERED());
    await flush();

    expect(statuses(conversation.getState())).toEqual(["VISITOR", "ERROR"]);
    expect(advisorAt(conversation.getState(), 1).response).toEqual(ERROR_RESPONSE());
  });

  it("drops a late answer from a superseded turn once a newer one has started", async () => {
    const held = heldTransport();
    const conversation = createAdvisorConversation({ transport: held.transport });

    conversation.send("primero");
    await flush();
    conversation.cancel();
    conversation.send("segundo");
    await flush();

    // The FIRST transport settles now; it no longer owns the surface.
    held.settleAt(0, ANSWERED());
    await flush();

    expect(statuses(conversation.getState())).toEqual([
      "VISITOR",
      "ERROR",
      "VISITOR",
      "PROCESSING",
    ]);
  });

  it("aborts the signal of the turn in flight", async () => {
    const held = heldTransport();
    const conversation = createAdvisorConversation({ transport: held.transport });

    conversation.send("hola");
    await flush();
    expect(held.calls[0]?.signal.aborted).toBe(false);

    conversation.cancel();
    expect(held.calls[0]?.signal.aborted).toBe(true);
  });

  it("reports that there was nothing to cancel", () => {
    const { transport } = fixedTransport(ANSWERED());
    const conversation = createAdvisorConversation({ transport });

    expect(conversation.cancel()).toBe(false);
  });

  it("drops a transport that rejects BECAUSE it was cancelled", async () => {
    const held = heldTransport();
    const conversation = createAdvisorConversation({ transport: held.transport });

    conversation.send("hola");
    await flush();
    conversation.cancel();
    // A transport that honours its signal by rejecting. The order inside
    // `invalidateAndAbort` — supersede, THEN abort — is what makes this land on
    // a token that is already stale instead of racing the cancel.
    held.failAt(0, new Error("aborted"));
    await flush();

    expect(statuses(conversation.getState())).toEqual(["VISITOR", "ERROR"]);
  });

  it("presents a cancellation as unconfirmed, never as an answer", async () => {
    const held = heldTransport();
    const conversation = createAdvisorConversation({ transport: held.transport });

    conversation.send("hola");
    await flush();
    conversation.cancel();

    const advisor = advisorAt(conversation.getState(), 1);
    expect(advisor.response.status).toBe("ERROR");
    expect(advisor.response.status).not.toBe("ANSWERED");
  });

  it("abort() writes no state but drops a result that lands afterwards", async () => {
    const held = heldTransport();
    const conversation = createAdvisorConversation({ transport: held.transport });

    conversation.send("hola");
    await flush();
    const before = conversation.getState();

    conversation.abort();
    // The unmount path does not settle anything: the surface is gone.
    expect(conversation.getState()).toBe(before);
    expect(held.calls[0]?.signal.aborted).toBe(true);

    held.settleAt(0, ANSWERED());
    await flush();
    expect(conversation.getState()).toBe(before);
  });

  it("stays usable after abort(), so a StrictMode remount can still send", async () => {
    const { transport, calls } = fixedTransport(ANSWERED());
    const conversation = createAdvisorConversation({ transport });

    conversation.abort();
    expect(sendOutcome(conversation, "hola").accepted).toBe(true);
    await flush();

    expect(calls).toHaveLength(1);
    expect(statuses(conversation.getState())).toEqual(["VISITOR", "ANSWERED"]);
  });

  it("dispose() refuses every further action and drops a result that lands afterwards", async () => {
    const held = heldTransport();
    const conversation = createAdvisorConversation({ transport: held.transport });
    const listener = vi.fn();
    conversation.subscribe(listener);

    conversation.send("hola");
    await flush();
    listener.mockClear();
    conversation.dispose();

    expectRefusal(sendOutcome(conversation, "otra vez"), "DISPOSED");
    expect(conversation.retry("advisor-2").reason).toBe("DISPOSED");

    held.settleAt(0, ANSWERED());
    await flush();
    // The listener set was released, so nothing is notified any more.
    expect(listener).not.toHaveBeenCalled();
  });
});

/* ============================== retry =================================== */

describe("retry — only ever on an explicit visitor action", () => {
  it("appends a NEW turn rather than rewriting the failed one", async () => {
    let call = 0;
    const transport: AdvisorTransport = () => {
      call += 1;
      return call === 1 ? Promise.reject(new Error("boom")) : Promise.resolve(ANSWERED());
    };
    const conversation = createAdvisorConversation({ transport });

    conversation.send("hola");
    await flush();

    const failed = advisorAt(conversation.getState(), 1);
    expect(failed.response.status).toBe("ERROR");

    expect(conversation.retry(failed.id).accepted).toBe(true);
    await flush();

    // Four entries: the failed attempt is still visible, and the retry is a new
    // visitor turn plus a new advisor turn.
    const state = conversation.getState();
    expect(state.entries).toHaveLength(4);
    expect(statuses(state)).toEqual(["VISITOR", "ERROR", "VISITOR", "ANSWERED"]);
    expect(entryAt(state, 2)).toEqual({ id: "visitor-3", role: "VISITOR", text: "hola" });
  });

  it("resends the same text the visitor typed", async () => {
    const held = heldTransport();
    const conversation = createAdvisorConversation({ transport: held.transport });

    conversation.send("cuánto cuesta");
    await flush();
    conversation.cancel();

    const failed = advisorAt(conversation.getState(), 1);
    expect(conversation.retry(failed.id).accepted).toBe(true);
    await flush();

    expect(held.calls).toHaveLength(2);
    expect(held.calls[1]?.text).toBe("cuánto cuesta");
  });

  it("refuses to retry a turn that produced a confirmed answer", async () => {
    const { transport } = fixedTransport(ANSWERED());
    const conversation = createAdvisorConversation({ transport });

    conversation.send("hola");
    await flush();

    expectRefusal(conversation.retry("advisor-2"), "NOT_RETRYABLE");
  });

  it("refuses to retry an unknown entry, and a visitor's own entry", async () => {
    const { transport } = fixedTransport(ANSWERED());
    const conversation = createAdvisorConversation({ transport });

    conversation.send("hola");
    await flush();

    expectRefusal(conversation.retry("advisor-999"), "NOT_RETRYABLE");
    expectRefusal(conversation.retry("visitor-1"), "NOT_RETRYABLE");
  });

  it("is as exclusive as a first send: a retry during a turn in flight is refused", async () => {
    const held = heldTransport();
    const conversation = createAdvisorConversation({ transport: held.transport });

    conversation.send("hola");
    await flush();
    conversation.cancel();
    conversation.send("otra");
    await flush();

    expectRefusal(conversation.retry("advisor-2"), "IN_FLIGHT");
    expect(held.calls).toHaveLength(2);
  });

  it("never retries by itself — one failure is exactly one transport call", async () => {
    const transport = vi.fn<AdvisorTransport>(() => Promise.reject(new Error("boom")));
    const conversation = createAdvisorConversation({ transport });

    conversation.send("hola");
    await flush();
    await flush();

    expect(transport).toHaveBeenCalledTimes(1);
  });
});

/* ============================ the store ================================= */

describe("the store", () => {
  it("notifies subscribers on a change and stops after unsubscribe", async () => {
    const { transport } = fixedTransport(ANSWERED());
    const conversation = createAdvisorConversation({ transport });
    const listener = vi.fn();
    const unsubscribe = conversation.subscribe(listener);

    conversation.send("hola");
    expect(listener).toHaveBeenCalled();

    await flush();
    unsubscribe();
    listener.mockClear();

    conversation.send("otra");
    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps a stable state reference until something really changes", () => {
    const { transport } = fixedTransport(ANSWERED());
    const conversation = createAdvisorConversation({ transport });

    const before = conversation.getState();
    expect(conversation.getState()).toBe(before);

    conversation.send("hola");
    expect(conversation.getState()).not.toBe(before);
  });

  it("shares nothing between two instances", async () => {
    const first = createAdvisorConversation({ transport: fixedTransport(ANSWERED()).transport });
    const second = createAdvisorConversation({ transport: fixedTransport(ANSWERED()).transport });

    first.send("hola");
    await flush();

    expect(first.getState().entries).toHaveLength(2);
    expect(second.getState()).toBe(EMPTY_CONVERSATION);
  });

  it("names entries with a counter, never with anything session-shaped", async () => {
    const { transport } = fixedTransport(ANSWERED());
    const conversation = createAdvisorConversation({ transport });

    conversation.send("hola");
    await flush();

    const state = conversation.getState();
    expect(state.entries.map((entry) => entry.id)).toEqual(["visitor-1", "advisor-2"]);
    for (const entry of state.entries) {
      // A deterministic counter, never a generated identifier: a uuid here would
      // look like a CA-6 conversation id, and these ids authorise nothing.
      expect(entry.id).toMatch(/^(visitor|advisor)-\d+$/);
    }
  });
});
