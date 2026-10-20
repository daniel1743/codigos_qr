/**
 * CRIPQER Conversion Advisor — CA-12 · failure UX under concurrency.
 *
 * One conversation failing — by rejection or by deadline — must be visible on
 * THAT transcript only: a second composer keeps working, its history is not
 * touched, and the retry of the failed turn appends to the failed conversation
 * alone. The controller is one instance per surface, and these tests hold that
 * per-instance boundary against the two failures a visitor can actually meet.
 *
 * ZERO REAL CALLS: every transport is scripted.
 */

import { describe, expect, it } from "vitest";

import {
  ADVISOR_UI_CONTRACT_VERSION,
  validateAdvisorUiResponse,
  type AdvisorSettledProjection,
} from "../../../../lib/conversion-advisor/integration/ui-contract";
import { createAdvisorConversation } from "../../../../lib/conversion-advisor/ui/conversation-controller";
import { createLandingAdvisorTransport, type LandingAdvisorBindings } from "../transport";

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

const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));
const wait = (ms: number): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, ms));

function statuses(conversation: ReturnType<typeof createAdvisorConversation>): string[] {
  return conversation
    .getState()
    .entries.map((entry) => (entry.role === "ADVISOR" ? entry.response.status : "VISITOR"));
}

function texts(conversation: ReturnType<typeof createAdvisorConversation>): string[] {
  return conversation
    .getState()
    .entries
    .filter((entry) => entry.role === "VISITOR")
    .map((entry) => entry.text);
}

describe("CA-12 — a failure stays on its own transcript", () => {
  it("1 · one rejected conversation does not blank or block another", async () => {
    let sessionCounter = 0;
    const startSession = async () => {
      sessionCounter += 1;
      return { session_id: `session-${sessionCounter}` };
    };

    // Fails its first turn, answers afterwards — the shape of a transient
    // provider failure followed by an explicit visitor retry.
    let failingCalls = 0;
    const failingTransport = createLandingAdvisorTransport({
      startSession,
      askTurn: async ({ message }) => {
        failingCalls += 1;
        if (failingCalls === 1) throw new Error("provider unreachable");
        return answered(`recuperado ${message}`);
      },
    });
    const healthyTransport = createLandingAdvisorTransport({
      startSession,
      askTurn: async ({ message }) => answered(`sano ${message}`),
    });

    const failing = createAdvisorConversation({ transport: failingTransport });
    const healthy = createAdvisorConversation({ transport: healthyTransport });

    failing.send("consulta frágil");
    healthy.send("consulta sana");
    await flush();
    await flush();

    expect(statuses(failing)).toEqual(["VISITOR", "ERROR"]);
    expect(statuses(healthy)).toEqual(["VISITOR", "ANSWERED"]);

    // The healthy conversation is untouched by the failure.
    const healthyBefore = healthy.getState();

    // The failed turn is the only retryable one, and the retry appends to the
    // failing conversation alone.
    const failedEntry = failing.getState().entries[1];
    if (failedEntry === undefined || failedEntry.role !== "ADVISOR") {
      throw new Error("CA12_TEST: expected an advisor entry");
    }
    expect(failing.retry(failedEntry.id).accepted).toBe(true);
    await flush();
    await flush();

    expect(statuses(failing)).toEqual(["VISITOR", "ERROR", "VISITOR", "ANSWERED"]);
    expect(texts(failing)).toEqual(["consulta frágil", "consulta frágil"]);
    expect(healthy.getState()).toBe(healthyBefore);
    expect(texts(healthy)).toEqual(["consulta sana"]);
  });

  it("2 · one timeout does not block or error another conversation", async () => {
    let sessionCounter = 0;
    const startSession = async () => {
      sessionCounter += 1;
      return { session_id: `session-${sessionCounter}` };
    };

    const bindings = (askTurn: LandingAdvisorBindings["askTurn"]): LandingAdvisorBindings => ({
      startSession,
      askTurn,
    });

    // A never answers; its transport's deadline is the only thing that settles
    // it. B answers normally on the same machine, at the same time.
    const neverAnswers = createLandingAdvisorTransport(
      bindings(() => new Promise<unknown>(() => {})),
      { timeoutMs: 30 },
    );
    const healthy = createLandingAdvisorTransport(
      bindings(async ({ message }) => answered(`sano ${message}`)),
    );

    const timedOut = createAdvisorConversation({ transport: neverAnswers });
    const unaffected = createAdvisorConversation({ transport: healthy });

    timedOut.send("consulta lenta");
    unaffected.send("consulta sana");

    await wait(60);
    await flush();

    expect(statuses(timedOut)).toEqual(["VISITOR", "ERROR"]);
    expect(statuses(unaffected)).toEqual(["VISITOR", "ANSWERED"]);
    expect(unaffected.getState().inFlightAdvisorId).toBeNull();
    // The timeout left the failed turn retryable, scoped to its transcript.
    expect(texts(timedOut)).toEqual(["consulta lenta"]);
  });

  it("3 · histories stay scoped to their own conversation through a failure", async () => {
    let sessionCounter = 0;
    const startSession = async () => {
      sessionCounter += 1;
      return { session_id: `session-${sessionCounter}` };
    };

    const conversations = ["A", "B"].map((name) =>
      createAdvisorConversation({
        transport: createLandingAdvisorTransport({
          startSession,
          askTurn: async ({ message }) =>
            name === "A" ? Promise.reject(new Error("boom")) : answered(`${name}:${message}`),
        }),
      }),
    );

    const [first, second] = conversations;
    first!.send("texto A");
    second!.send("texto B");
    await flush();
    await flush();

    expect(texts(first!)).toEqual(["texto A"]);
    expect(texts(second!)).toEqual(["texto B"]);
    expect(statuses(first!)).toEqual(["VISITOR", "ERROR"]);
    expect(statuses(second!)).toEqual(["VISITOR", "ANSWERED"]);
  });
});
