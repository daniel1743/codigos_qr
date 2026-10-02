/**
 * Single browser session contract for Analytics V1.1.
 *
 * Reuses the pre-existing `sessionStorage["qr_session_id"]` key so the canonical
 * writer does NOT introduce a second, competing session system. The generated id
 * contains no email/name/PII — only a timestamp and a random suffix.
 */

export const QR_SESSION_STORAGE_KEY = "qr_session_id";
export const QR_UTM_SOURCE_STORAGE_KEY = "qr_utm_source";
export const QR_UTM_CAMPAIGN_STORAGE_KEY = "qr_utm_campaign";

export interface AnalyticsCampaignContext {
  utmSource?: string;
  utmCampaign?: string;
}

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

function normalizeUtmValue(value: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function readSessionValue(key: string): string | undefined {
  try {
    return normalizeUtmValue(window.sessionStorage.getItem(key));
  } catch {
    return undefined;
  }
}

function writeSessionValue(key: string, value: string | undefined): void {
  try {
    if (value) window.sessionStorage.setItem(key, value);
    else window.sessionStorage.removeItem(key);
  } catch {
    // Storage can be unavailable; event context remains safely optional.
  }
}

/** Capture UTM context from the current public URL and preserve it in-session. */
export function getOrCreateAnalyticsCampaignContext(): AnalyticsCampaignContext {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const hasUtmSource = params.has("utm_source");
  const hasUtmCampaign = params.has("utm_campaign");
  const utmSource = hasUtmSource
    ? normalizeUtmValue(params.get("utm_source"))
    : readSessionValue(QR_UTM_SOURCE_STORAGE_KEY);
  const utmCampaign = hasUtmCampaign
    ? normalizeUtmValue(params.get("utm_campaign"))
    : readSessionValue(QR_UTM_CAMPAIGN_STORAGE_KEY);

  if (hasUtmSource) writeSessionValue(QR_UTM_SOURCE_STORAGE_KEY, utmSource);
  if (hasUtmCampaign) writeSessionValue(QR_UTM_CAMPAIGN_STORAGE_KEY, utmCampaign);

  return {
    ...(utmSource ? { utmSource } : {}),
    ...(utmCampaign ? { utmCampaign } : {}),
  };
}
