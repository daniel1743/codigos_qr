/**
 * CRIPQER Conversion Advisor — CA-6 · session store.
 *
 * EPHEMERAL IN-MEMORY, on purpose: persistence is DEFERRED, so nothing about a
 * visitor survives the process. No IP, no fingerprint, no cookie, no Supabase,
 * no full transcript — only the distilled context of `context.ts`.
 *
 * LIMITATION the caller must know: an in-memory Map lives in ONE process. If
 * the app runs on several instances (or serverless), two requests from the same
 * visitor can land on different processes and the memory will not follow. That
 * is why the contract is "best effort, per instance" and why persistence is a
 * separate, later decision — not a silent assumption.
 *
 * A session id identifies a CONVERSATION, never a person: it is never proof of
 * authorization for anything. CA-5 decides what may happen; this module only
 * remembers.
 */

import { emptyContext, SESSION_LIMITS, type SessionContext } from "./context";

export interface AdvisorSession {
  readonly id: string;
  readonly created_at: number;
  readonly last_seen_at: number;
  readonly context: SessionContext;
}

export type SessionFailure =
  "INVALID_SESSION_ID" | "UNKNOWN_SESSION" | "EXPIRED" | "TURN_LIMIT_REACHED";

export type SessionResult =
  | { readonly ok: true; readonly session: AdvisorSession }
  | { readonly ok: false; readonly reason: SessionFailure };

const sessions = new Map<string, AdvisorSession>();

/** A v4-shaped uuid. Anything else is refused before it can reach the map. */
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidSessionId(value: unknown): value is string {
  return typeof value === "string" && SESSION_ID_PATTERN.test(value);
}

function isExpired(session: AdvisorSession, now: number): boolean {
  return (
    now - session.last_seen_at > SESSION_LIMITS.inactivityTimeoutMs ||
    now - session.created_at > SESSION_LIMITS.absoluteTimeoutMs
  );
}

function touch(session: AdvisorSession, now: number): AdvisorSession {
  const updated: AdvisorSession = { ...session, last_seen_at: now };
  sessions.set(updated.id, updated);
  return updated;
}

/** Cryptographic random: a session id is unguessable and carries no meaning. */
export function createSession(now: number = Date.now()): AdvisorSession {
  const session: AdvisorSession = {
    id: crypto.randomUUID(),
    created_at: now,
    last_seen_at: now,
    context: emptyContext(),
  };
  sessions.set(session.id, session);
  return session;
}

/** Reads a session, expiring it lazily. An unknown id and an expired id are
 *  indistinguishable to the caller — no oracle for guessing ids. */
export function getSession(id: unknown, now: number = Date.now()): AdvisorSession | null {
  if (!isValidSessionId(id)) return null;
  const session = sessions.get(id);
  if (!session) return null;
  if (isExpired(session, now)) {
    sessions.delete(id);
    return null;
  }
  return touch(session, now);
}

/**
 * Stores the context for a turn. Enforces the two budgets: the per-session turn
 * limit and expiry. When the turn limit is reached the caller must start a new
 * session — the limit is not silently extended.
 */
export function saveContext(
  id: unknown,
  context: SessionContext,
  now: number = Date.now(),
): { readonly ok: true } | { readonly ok: false; readonly reason: SessionFailure } {
  if (!isValidSessionId(id)) return { ok: false, reason: "INVALID_SESSION_ID" };
  const session = sessions.get(id);
  if (!session) return { ok: false, reason: "UNKNOWN_SESSION" };
  if (isExpired(session, now)) {
    sessions.delete(id);
    return { ok: false, reason: "EXPIRED" };
  }
  if (context.turns_total > SESSION_LIMITS.maxTurnsTotal)
    return { ok: false, reason: "TURN_LIMIT_REACHED" };
  sessions.set(id, { ...session, last_seen_at: now, context });
  return { ok: true };
}

/** Forgets everything that was said, keeping the conversation alive. */
export function clearContext(id: unknown, now: number = Date.now()): boolean {
  if (!isValidSessionId(id)) return false;
  const session = sessions.get(id);
  if (!session || isExpired(session, now)) {
    sessions.delete(id as string);
    return false;
  }
  sessions.set(id, { ...session, last_seen_at: now, context: emptyContext() });
  return true;
}

export function endSession(id: unknown): boolean {
  if (!isValidSessionId(id)) return false;
  return sessions.delete(id);
}

/** Proactive expiry for long-lived processes. Returns how many were removed. */
export function sweepExpired(now: number = Date.now()): number {
  let removed = 0;
  for (const [id, session] of sessions) {
    if (isExpired(session, now)) {
      sessions.delete(id);
      removed += 1;
    }
  }
  return removed;
}

/** Operational count only — never exposed to a visitor. */
export function activeSessionCount(): number {
  return sessions.size;
}

/** Test helper. Not part of the product surface. */
export function __resetAllSessionsForTests(): void {
  sessions.clear();
}
