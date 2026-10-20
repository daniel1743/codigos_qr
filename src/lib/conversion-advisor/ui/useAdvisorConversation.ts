/**
 * CRIPQER Conversion Advisor — CA-7.4-B · the React binding.
 *
 * The thinnest possible layer over `conversation-controller.ts`: it creates one
 * controller per mounted surface, subscribes React to its state, and tears the
 * turn in flight down on unmount. Every rule lives in the controller, so there
 * is exactly one implementation of "one request at a time" and exactly one place
 * where a public response is validated.
 *
 * WHY `useSyncExternalStore` AND NOT `useState`. The controller is an external
 * store that changes from a promise callback, outside React's own event
 * handling. `useSyncExternalStore` is the primitive built for that: it reads the
 * current value during render, so a turn that settled between a render and its
 * commit cannot be shown as the previous state. Binding it with `useState` and
 * an effect would work in the happy path and tear under exactly the timing this
 * phase is about.
 *
 * `getServerSnapshot` IS SUPPLIED, and that is a real decision rather than
 * boilerplate: this app server-renders, and without a server snapshot
 * `useSyncExternalStore` throws during SSR. A conversation always begins empty,
 * so the server's answer is the empty conversation and hydration matches.
 *
 * THE TRANSPORT IS READ ONCE, AT MOUNT. A surface is given its transport when it
 * is created; swapping it requires a remount (a changed `key`), because a
 * mid-flight turn belongs to the transport that started it. That constraint is
 * documented in the README rather than papered over with a ref that would make
 * two different transports look interchangeable.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import {
  createAdvisorConversation,
  type AdvisorConversation,
  type SendOutcome,
} from "./conversation-controller";
import type { AdvisorTransport, ConversationEntry } from "./types";

export interface UseAdvisorConversationResult {
  readonly entries: readonly ConversationEntry[];
  /** True while one turn is waiting for its transport. */
  readonly pending: boolean;
  readonly maxMessageChars: number;
  /** Accepts the text, or explains why it did not. Never throws. */
  readonly send: (text: string) => SendOutcome;
  /** Resends a failed turn. Only meaningful from an explicit visitor action. */
  readonly retry: (entryId: string) => SendOutcome;
  readonly cancel: () => boolean;
  /** The controller itself, for a host that needs to tear it down. */
  readonly conversation: AdvisorConversation;
}

export function useAdvisorConversation(transport: AdvisorTransport): UseAdvisorConversationResult {
  // `useState` with an initialiser, so the controller is built once per mount and
  // never on a re-render.
  const [conversation] = useState(() => createAdvisorConversation({ transport }));

  const state = useSyncExternalStore(
    conversation.subscribe,
    conversation.getState,
    conversation.getState,
  );

  useEffect(
    () => () => {
      // An unmount must not apply a result that is still coming, and must tell
      // the transport to stop. `abort()` and not `dispose()`: StrictMode's
      // simulated unmount would otherwise leave the remounted surface unable to
      // send. See the controller's own note on the two.
      conversation.abort();
    },
    [conversation],
  );

  const send = useCallback((text: string) => conversation.send(text), [conversation]);
  const retry = useCallback((entryId: string) => conversation.retry(entryId), [conversation]);
  const cancel = useCallback(() => conversation.cancel(), [conversation]);

  return {
    entries: state.entries,
    pending: state.inFlightAdvisorId !== null,
    maxMessageChars: conversation.maxMessageChars,
    send,
    retry,
    cancel,
    conversation,
  };
}
