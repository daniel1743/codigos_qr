/**
 * CRIPQER Conversion Advisor — CA-7.4-C · the browser entry of the test host.
 *
 * This is the HOST's code, not the surface's. It mounts the real
 * `AdvisorConversation` from CA-7.4-B and gives it the transport the surface
 * requires — one that POSTs the visitor's text to the host and returns whatever
 * the host answered, `unknown` and unvalidated, exactly as the production
 * transport would.
 *
 * The scenario and the instance count come from the URL, because they are
 * properties of the TEST, not of the surface: the surface never learns which
 * pipeline condition it is meeting. It sees `{ text, signal }` and a promise,
 * which is the whole of the contract it is given.
 *
 * THE SESSION HANDLE LIVES HERE, in the transport — never in the surface, never
 * in the DOM, never in storage. That is CA-7.4-B's own design ("the transport
 * owns the conversation's identity"), and it is what lets E16 assert that the
 * interface itself carries no session identifier at all.
 */

import { createRoot } from "react-dom/client";

import { AdvisorConversation } from "../AdvisorConversation";
import type { AdvisorTransport } from "../types";

const params = new URLSearchParams(window.location.search);
const scenario = params.get("scenario") ?? "answered";
const instances = Math.max(1, Number(params.get("instances") ?? "1"));

/** Asks the host for a conversation. The handle is opaque to this file. */
async function newSession(): Promise<string> {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    // The scenario fixes the CONVERSATION's guard limits, so it is sent when the
    // conversation starts, not per turn.
    body: JSON.stringify({ scenario }),
  });
  if (!response.ok) throw new Error("CA7_4C_HOST: could not start a session");
  const body = (await response.json()) as { handle?: unknown };
  return String(body.handle);
}

/**
 * The transport the surface is given. It is the only path out of the browser,
 * and it returns `unknown` on purpose so the surface's own validation is the
 * thing that decides whether a response may be rendered.
 */
function makeTransport(): AdvisorTransport {
  // One conversation per surface, created lazily on the first turn and reused
  // after it, so the second message continues the same conversation.
  let handle: Promise<string> | null = null;

  return async ({ text, signal }) => {
    handle ??= newSession();
    const session = await handle;
    const response = await fetch("/api/turn", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, scenario, handle: session }),
      signal,
    });
    if (!response.ok) throw new Error("CA7_4C_HOST: transport failed");
    return (await response.json()) as unknown;
  };
}

const root = document.getElementById("root");
if (root === null) throw new Error("CA7_4C_HOST: no #root");

// One transport per surface, so two surfaces on one page are two conversations
// that share no memory — which is what E10 checks.
const surfaces = Array.from({ length: instances }, (_, index) => (
  <AdvisorConversation
    key={index}
    transport={makeTransport()}
    ariaLabel={`Conversación ${index + 1}`}
  />
));

createRoot(root).render(<div className="flex flex-col gap-8 p-4">{surfaces}</div>);
