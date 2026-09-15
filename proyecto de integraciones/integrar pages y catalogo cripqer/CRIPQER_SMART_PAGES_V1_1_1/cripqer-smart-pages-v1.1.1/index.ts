/**
 * CRIPQER SMART PAGES V1 — portable public surface.
 *
 * Import path is intentionally flat and framework-light:
 *   Intake -> Normalization -> PageGenerationRequest -> Page Orchestrator
 *   -> PagePlanV1 -> EngineV2Adapter (host) -> Master Runtime
 */

export * from "./catalog.types";
export * from "./ecosystem";
export * from "./smart-pages.types";
export * from "./intake-adapters";
export * from "./content-normalizer";
export * from "./business-presets";
export * from "./page-orchestrator";
export * from "./sales-actions";
export * from "./engine-v2-adapter";
export { MasterPageRuntime } from "./runtime/MasterPageRuntime";
export type { MasterPageRuntimeProps } from "./runtime/MasterPageRuntime";
export * from "./smart-pages.fixtures";
