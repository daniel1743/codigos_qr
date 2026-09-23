/**
 * CRIPQER Analytics V1.1 — coarse, deterministic device classification.
 *
 * Maps a browser user-agent string to the fixed `qr_analytics.device_type`
 * contract (`mobile` | `desktop` | `tablet` | `unknown`).
 *
 * Privacy contract:
 *   * No fingerprinting — no canvas/webgl/screen heuristics, no persisted
 *     per-person identity.
 *   * No precise device models are invented (no "iPhone 15 Pro", etc.).
 *   * A missing/empty user-agent resolves to `unknown` (truthful, not guessed).
 *
 * The rules below intentionally mirror the pre-existing legacy classification
 * already shipped in `analyticsService.detectDeviceType` so the canonical
 * writer does not introduce a second, divergent classification.
 */

export type DeviceClassification = "mobile" | "desktop" | "tablet" | "unknown";

export function classifyDeviceType(userAgent: string | null | undefined): DeviceClassification {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();

  // Tablet first: Android tablets advertise Android but NOT "Mobile"/"mobi".
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }

  if (
    /mobile|android|ip(hone|od)|iemobile|blackberry|kindle|silk-accelerated|(hpw|web)os|opera m(obi|ini)/.test(
      ua,
    )
  ) {
    return "mobile";
  }

  return "desktop";
}
