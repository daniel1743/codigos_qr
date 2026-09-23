/**
 * Single browser session contract for Analytics V1.1.
 *
 * Reuses the pre-existing `sessionStorage["qr_session_id"]` key so the canonical
 * writer does NOT introduce a second, competing session system. The generated id
 * contains no email/name/PII — only a timestamp and a random suffix.
 */

export const QR_SESSION_STORAGE_KEY = "qr_session_id";

function generateSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
}

/** Get or create the single pseudonymous browser session id. */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return generateSessionId();
  try {
    let sessionId = window.sessionStorage.getItem(QR_SESSION_STORAGE_KEY);
    if (!sessionId) {
      sessionId = generateSessionId();
      window.sessionStorage.setItem(QR_SESSION_STORAGE_KEY, sessionId);
    }
    return sessionId;
  } catch {
    // Storage unavailable: fall back to an ephemeral id for this call only.
    return generateSessionId();
  }
}
