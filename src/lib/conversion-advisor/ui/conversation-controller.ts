/**
 * CRIPQER Conversion Advisor — CA-7.4-B · the conversation controller.
 *
 * The whole of the surface's LOGIC, in one place and free of React: a pure
 * reducer that says what a visible transcript does, and a small stateful
 * controller that owns the four hard parts the brief names — validating a public
 * response, controlling concurrency, managing aborts, and dropping answers that
 * arrive out of order.
 *
 * It is React-free on purpose. Every rule below is a rule about VALUES, so it is
 * provable in a plain Node test without a DOM, a timer or a mounted tree; the
 * hook in `useAdvisorConversation.ts` does nothing but bind this object to React.
 *
 * WHAT IT NEVER DOES: no `fetch`, no server module, no `process.env`, no
 * `createServerFn`, no storage, no clock, no randomness, no navigation. The
 * transport is injected and is the only way out of this file.
 *
 * ORDERING, AND WHY A TOKEN. Every accepted turn takes the next token. When a
 * transport settles, its token is compared against the current one: a result
 * from a superseded turn is DROPPED, never rendered. That is what makes three
 * separate brief requirements true at once — a late answer after a cancel, a
 * slow answer after a newer send, and an answer that lands after the component
 * unmounted all fail the same comparison and all leave the surface untouched.
 */

import { TURN_LIMITS } from "../integration/contract";
import { validateAdvisorUiResponse } from "../integration/ui-contract";
import type { AdvisorUiResponse } from "../integration/ui-contract";
import { pendingAdvisorTurn, projectAdvisorTurn } from "../integration/ui-projection";
import {
  EMPTY_CONVERSATION,
  isRetryable,
  type AdvisorEntry,
  type AdvisorTransport,
  type ConversationEntry,
  type ConversationState,
  type VisitorEntry,
} from "./types";

/* ================================ reducer =============================== */

/**
 * The two things that can change a visible transcript.
 *
 * There is no "CANCELLED" action, and its absence is a decision. A cancelled
 * turn and a transport that failed are the SAME fact on the surface — there is
 * no confirmed answer — and CA-7.4-A says so directly: a transport failure and a
 * server-side refusal that did not survive the wire are indistinguishable here,
 * so pretending to tell them apart would report a guess as a fact. Cancellation
 * therefore settles as `ERROR` through this same action, and "no presentar
 * cancelación como éxito" needs no special case.
 */
export type ConversationAction =
  | {
      readonly type: "TURN_STARTED";
      readonly visitor: VisitorEntry;
      readonly advisor: AdvisorEntry;
    }
  | {
      readonly type: "TURN_SETTLED";
      readonly advisorId: string;
      readonly response: AdvisorUiResponse;
    };

function replaceResponse(
  entries: readonly ConversationEntry[],
  advisorId: string,
  response: AdvisorUiResponse,
): readonly ConversationEntry[] {
  return entries.map((entry) =>
    entry.id === advisorId && entry.role === "ADVISOR" ? { ...entry, response } : entry,
  );
}

/**
 * Pure and total.
 *
 * A STALE action returns the state it was given, by reference. That is not a
 * micro-optimisation: the surface subscribes to this state, so a new object for
 * an action that changed nothing would be a re-render that reports a change that
 * did not happen.
 */
export function conversationReducer(
  state: ConversationState,
  action: ConversationAction,
): ConversationState {
  switch (action.type) {
    case "TURN_STARTED":
      return {
        entries: [...state.entries, action.visitor, action.advisor],
        inFlightAdvisorId: action.advisor.id,
      };

    case "TURN_SETTLED": {
      // A result for a turn that is no longer the one in flight is not applied.
      if (state.inFlightAdvisorId !== action.advisorId) return state;
      return {
        entries: replaceResponse(state.entries, action.advisorId, action.response),
        inFlightAdvisorId: null,
      };
    }
  }
}

/* ============================== the outcome ============================= */

/** Why a send or a retry was not accepted. `ACCEPTED` is the only success. */
export type SendRefusal =
  "ACCEPTED" | "IN_FLIGHT" | "EMPTY" | "TOO_LONG" | "DISPOSED" | "NOT_RETRYABLE";

export interface SendOutcome {
  readonly accepted: boolean;
  readonly reason: SendRefusal;
}

const ACCEPTED: SendOutcome = { accepted: true, reason: "ACCEPTED" };

function refused(reason: SendRefusal): SendOutcome {
  return { accepted: false, reason };
}

/* ============================= the controller =========================== */

export interface AdvisorConversationOptions {
  readonly transport: AdvisorTransport;
}

export interface AdvisorConversation {
  /** The current visible state. A stable reference until something changes. */
  getState(): ConversationState;
  /** Registers a listener. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** The longest message this surface will send. CA-7.1B's own bound. */
  readonly maxMessageChars: number;
  send(text: string): SendOutcome;
  /** Resends a failed turn's text. Only ever on an explicit visitor action. */
  retry(entryId: string): SendOutcome;
  /** Aborts the turn in flight and settles it as unconfirmed. */
  cancel(): boolean;
  /**
   * Invalidates and aborts the turn in flight WITHOUT writing any state.
   *
   * This is the unmount path, and it is deliberately not `dispose`: React's
   * StrictMode simulates an unmount and remounts, so a hook cleanup that
   * permanently poisoned the conversation would leave the second mount unable to
   * send anything. Aborting the turn is the whole of what an unmount requires —
   * no result may be applied afterwards, and the transport is told to stop — and
   * the object stays usable.
   */
  abort(): void;
  /** Final teardown: abort, refuse every further action, release the listeners. */
  dispose(): void;
}

/**
 * Builds one conversation. One instance per mounted surface, so two surfaces
 * mounted side by side share nothing: there is no module-level state in this
 * file, and no store the two could meet in.
 */
export function createAdvisorConversation(
  options: AdvisorConversationOptions,
): AdvisorConversation {
  const { transport } = options;

  let state: ConversationState = EMPTY_CONVERSATION;
  const listeners = new Set<() => void>();
  /**
   * Identifies the turn that is allowed to settle. Bumped by every accepted
   * send, by a cancel and by a dispose, so anything already in flight is
   * superseded by a single comparison.
   */
  let token = 0;
  let active: AbortController | null = null;
  let disposed = false;
  /**
   * A counter, not a uuid. These ids name a message ON SCREEN and are never sent
   * anywhere, never persisted and never used to authorise anything — so they
   * must not look like the conversation identifiers CA-6 issues, and a
   * deterministic counter is also what lets a test assert exact transcripts.
   */
  let nextId = 0;

  function emit(): void {
    for (const listener of listeners) listener();
  }

  function setState(next: ConversationState): void {
    // By reference: a no-op action must not look like a change to React.
    if (next === state) return;
    state = next;
    emit();
  }

  function dispatch(action: ConversationAction): void {
    setState(conversationReducer(state, action));
  }

  function idFor(role: "visitor" | "advisor"): string {
    nextId += 1;
    return `${role}-${nextId}`;
  }

  /**
   * Applies a settled response, if it is still the turn that owns the surface.
   *
   * Both guards are here and neither is redundant: the token catches a
   * superseded turn, and `disposed` catches a result that arrives after the
   * surface is gone — in which case nothing is written at all, so a component
   * that unmounted mid-flight can never be updated.
   */
  function settle(myToken: number, advisorId: string, response: AdvisorUiResponse): void {
    if (disposed || myToken !== token) return;
    active = null;
    dispatch({ type: "TURN_SETTLED", advisorId, response });
  }

  /**
   * Starts one turn. Assumes the single-flight and bounds checks have passed.
   *
   * The transport is called through `Promise.resolve().then(...)` so that a
   * transport which THROWS SYNCHRONOUSLY is handled by the same rejection path
   * as one that returns a rejected promise. A caller that had to remember to
   * wrap its transport would eventually forget.
   */
  function runTurn(text: string): void {
    token += 1;
    const myToken = token;

    const visitor: VisitorEntry = { id: idFor("visitor"), role: "VISITOR", text };
    const advisor: AdvisorEntry = {
      id: idFor("advisor"),
      role: "ADVISOR",
      response: pendingAdvisorTurn(),
      retryText: text,
    };
    dispatch({ type: "TURN_STARTED", visitor, advisor });

    const controller = new AbortController();
    active = controller;

    Promise.resolve()
      .then(() => transport({ text, signal: controller.signal }))
      .then(
        (raw) => {
          // THE boundary. Whatever the transport returned is a value from
          // outside, so it is validated before anything renders it — and a
          // payload with an unauthorised field, a bad status, a non-empty
          // `actions` or a notice whose text is not the contract's is NOT
          // repaired and NOT shown: the turn becomes ERROR, the one state that
          // claims nothing.
          const validation = validateAdvisorUiResponse(raw);
          const response = validation.ok
            ? (raw as AdvisorUiResponse)
            : projectAdvisorTurn({ kind: "error" });
          settle(myToken, advisor.id, response);
        },
        () => {
          // A rejection carries no payload into the surface: the ERROR projection
          // has nowhere to put a message, so a stack trace or a provider string
          // cannot be rendered even by accident.
          settle(myToken, advisor.id, projectAdvisorTurn({ kind: "error" }));
        },
      );
  }

  /**
   * The bounds and the single-flight rule, in one place.
   *
   * Returns `null` when the text may be sent. Both `send` and `retry` come
   * through here, so the two can never drift apart: a retry is as bounded and as
   * exclusive as a first send.
   */
  function refuseSend(text: string): SendOutcome | null {
    if (disposed) return refused("DISPOSED");
    if (state.inFlightAdvisorId !== null) return refused("IN_FLIGHT");
    const trimmed = text.trim();
    if (trimmed === "") return refused("EMPTY");
    if (trimmed.length > TURN_LIMITS.maxMessageChars) return refused("TOO_LONG");
    return null;
  }

  function acceptAndRun(text: string): SendOutcome {
    const refusal = refuseSend(text);
    if (refusal !== null) return refusal;
    runTurn(text.trim());
    return ACCEPTED;
  }

  /**
   * Supersede first, then abort. The order matters: a transport that reacts to
   * its signal by rejecting lands on a token that is already stale, so the
   * rejection is dropped instead of racing whoever aborted it.
   */
  function invalidateAndAbort(): void {
    token += 1;
    const controller = active;
    active = null;
    controller?.abort();
  }

  return {
    getState: () => state,

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    maxMessageChars: TURN_LIMITS.maxMessageChars,

    send: acceptAndRun,

    retry: (entryId) => {
      if (disposed) return refused("DISPOSED");
      const entry = state.entries.find((candidate) => candidate.id === entryId);
      // Only a turn with no confirmed response may be resent, and only ever on
      // the visitor's explicit action. A retry is a NEW turn appended to the
      // transcript, so the failed attempt stays visible instead of being quietly
      // rewritten as if it had worked.
      if (entry === undefined || !isRetryable(entry)) return refused("NOT_RETRYABLE");
      return acceptAndRun(entry.retryText);
    },

    cancel: () => {
      const inFlight = state.inFlightAdvisorId;
      if (inFlight === null) return false;
      invalidateAndAbort();
      // Settled here, exactly once, as ERROR — never as a success.
      dispatch({
        type: "TURN_SETTLED",
        advisorId: inFlight,
        response: projectAdvisorTurn({ kind: "error" }),
      });
      return true;
    },

    abort: invalidateAndAbort,

    dispose: () => {
      disposed = true;
      invalidateAndAbort();
      listeners.clear();
    },
  };
}
