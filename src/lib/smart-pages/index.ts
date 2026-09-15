/**
 * CRIPQER SMART PAGES — production-safe semantic surface (SMART_PAGES_2).
 *
 * Exposes ONLY the portable semantic planning layer.
 *   Intake -> Normalization -> PageGenerationRequest -> Page Orchestrator
 *     -> PagePlanV1 / MiniSitePlanV1  (STOP HERE in this phase)
 */

export * from "./catalog.types";
export * from "./smart-pages.types";
export * from "./content-normalizer";
export * from "./business-presets";
export * from "./page-orchestrator";
export * from "./sales-actions";
