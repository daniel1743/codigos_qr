/**
 * CRIPQER Intelligent Analytics V1.1 — dashboard mode resolution (C2B8).
 *
 * Single, pure decision point for which dashboard `/pages/$pageId/analytics`
 * renders. It exists so the production canary can be enabled WITHOUT letting the
 * URL (or any user input) decide what a page sees.
 *
 *   DEV (vite dev)
 *     · `?analytics=legacy` → legacy
 *     · `?analytics=real`   → real
 *     · anything else       → fixtures        (QA only, never in production)
 *
 *   PRODUCTION
 *     · page row not loaded yet                     → pending (loading state)
 *     · canary gate ON and this page allowlisted    → real
 *     · anything else (flag off, page not in the
 *       allowlist, missing public_id, gate error)   → legacy      (fail-closed)
 *
 * Production NEVER reads the query string: the real dashboard is authorized by
 * the page row itself (owner-scoped fetch) plus the existing
 * `VITE_ANALYTICS_CANONICAL_*` canary gate. Every unknown input collapses to
 * `legacy`, so the rollout cannot open V1.1 by accident.
 */

export type AnalyticsDashboardMode = "fixtures" | "real" | "legacy" | "pending";

const QUERY_PARAM = "analytics";

/** DEV-only QA selector, read from a raw query string. */
export function resolveDevDashboardMode(search: string | null | undefined): AnalyticsDashboardMode {
  const param = new URLSearchParams(search ?? "").get(QUERY_PARAM);
  if (param === "legacy") return "legacy";
  if (param === "real") return "real";
  return "fixtures";
}

export interface DashboardModeInput {
  /** `import.meta.env.DEV` */
  isDev: boolean;
  /** `window.location.search`; honored in DEV only. */
  search?: string | null | undefined;
  /** Owner-scoped page row, or null/undefined while it is still being fetched. */
  page?: { publicId?: string | null | undefined } | null | undefined;
  /** Verdict of the production canary gate for this page. */
  realModeEnabled?: boolean | undefined;
}

export function resolveAnalyticsDashboardMode(input: DashboardModeInput): AnalyticsDashboardMode {
  // DEV keeps today's QA behaviour exactly as it was.
  if (input.isDev) return resolveDevDashboardMode(input.search);

  // Production: without the owner-scoped page row the gate cannot be decided,
  // so stay in the loading state instead of guessing.
  if (!input.page) return "pending";

  const publicId = (input.page.publicId ?? "").trim();
  if (!input.realModeEnabled) return "legacy";
  if (!publicId) return "legacy";
  return "real";
}
