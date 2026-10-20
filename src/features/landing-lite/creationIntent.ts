/**
 * Landing Launch Lite V2 - safe, session-local creation intent.
 *
 * The visitor who presses "Personalizar una tarjeta" has expressed one clear
 * intent: create and edit their own card. Today the anonymous branch sends them
 * to the real registration flow and then drops them on `/profile`, losing that
 * intent.
 *
 * This module records *only* that a creation intent exists. It is deliberately
 * minimal and safe by construction:
 *
 *   - sessionStorage only: same-origin, same-tab, cleared with the tab. It is
 *     never shared, never persisted across devices and never read by a server.
 *   - No token, no URL, no user data, no destination. The resume action is a
 *     fixed internal call, so this cannot become an open redirect.
 *   - Validated on read: a malformed, foreign-versioned or expired payload is
 *     treated as absent, never as a redirect.
 *   - Fail-safe: any storage error (private mode, blocked storage) is swallowed
 *     and simply means "no intent" - the visitor keeps the normal flow.
 *
 * It is an *indicator of intent*, not an authentication mechanism: it never
 * grants access, and every creation step still re-checks the real session.
 */
export const CREATION_INTENT_KEY = "cripqer:landing-lite:creation-intent:v1";
export const CREATION_INTENT_VERSION = 1;
/** Signing up (and confirming an email) is the slow part; 30 minutes is ample. */
export const CREATION_INTENT_TTL_MS = 30 * 60 * 1000;

interface CreationIntentPayload {
  v: number;
  createdAt: number;
}

function resolveStorage(storage?: Storage | null): Storage | null {
  if (storage) return storage;
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Record the creation intent. Silent on failure - an absent intent is safe. */
export function markCreationIntent(storage?: Storage | null, now: number = Date.now()): void {
  const target = resolveStorage(storage);
  if (!target) return;
  const payload: CreationIntentPayload = { v: CREATION_INTENT_VERSION, createdAt: now };
  try {
    target.setItem(CREATION_INTENT_KEY, JSON.stringify(payload));
  } catch {
    /* storage unavailable: the visitor simply keeps the normal flow */
  }
}

/**
 * Read the pending intent, validating shape, version and expiry.
 * A malformed or expired payload is discarded and reported as absent.
 */
export function readCreationIntent(storage?: Storage | null, now: number = Date.now()): boolean {
  const target = resolveStorage(storage);
  if (!target) return false;
  let raw: string | null;
  try {
    raw = target.getItem(CREATION_INTENT_KEY);
  } catch {
    return false;
  }
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as Partial<CreationIntentPayload>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.v !== CREATION_INTENT_VERSION ||
      typeof parsed.createdAt !== "number" ||
      !Number.isFinite(parsed.createdAt)
    ) {
      clearCreationIntent(target);
      return false;
    }
    const age = now - parsed.createdAt;
    if (age < 0 || age > CREATION_INTENT_TTL_MS) {
      clearCreationIntent(target);
      return false;
    }
    return true;
  } catch {
    clearCreationIntent(target);
    return false;
  }
}

/** Drop the intent. Called before resuming and when it is rejected. */
export function clearCreationIntent(storage?: Storage | null): void {
  const target = resolveStorage(storage);
  if (!target) return;
  try {
    target.removeItem(CREATION_INTENT_KEY);
  } catch {
    /* nothing to clear */
  }
}
