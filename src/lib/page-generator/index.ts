/**
 * PAGES_7 — Page Generator integration surface.
 *
 * Everything exported here is the host-owned adapter around the EXISTING
 * Engine V2 generator. It owns no renderer, no canonical schema, no persistence
 * and no public identity.
 */

export {
  GENERATED_PAGE_ACTION_LABELS,
  GENERATED_PAGE_ACTION_TYPES,
  GENERATED_PAGE_OBJECTIVES,
  GENERATED_PAGE_STYLES,
  type GeneratedActionType,
  type GeneratedBusinessCategory,
  type GeneratedItemKind,
  type GeneratedPageActionType,
  type GeneratedPageCta,
  type GeneratedPageInput,
  type GeneratedPageItem,
  type GeneratedPageObjective,
  type GeneratedPageStyle,
} from "./types";
export {
  GENERATED_PAGE_OBJECTIVE_PRESETS,
  type GeneratedPageObjectivePreset,
} from "./objective-presets";
export {
  generatedPageItems,
  validateGeneratedPageInput,
  validateGeneratedPageItem,
  type GeneratedPageValidationCode,
  type GeneratedPageValidationIssue,
  type GeneratedPageValidationResult,
} from "./validation";
export { buildGeneratedPageIntent, type GeneratedPageIntentOptions } from "./intent";
export {
  getOwnerContentReadiness,
  ownerContentFromGeneratedPageInput,
  ownerContentToEngineContentBlocks,
  ownerContentToNormalizedContent,
  ownerContentToPageGenerationRequest,
  validateOwnerContentInput,
  type OwnerContactInput,
  type OwnerContentInput,
  type OwnerContentIdentity,
  type OwnerContentPageGenerationContext,
  type OwnerContentNormalizedContext,
  type OwnerContentReadinessIssue,
  type OwnerContentReadinessResult,
  type OwnerContentValidationCode,
  type OwnerContentValidationIssue,
  type OwnerContentValidationResult,
  type OwnerEventInput,
  type OwnerMediaReference,
  type OwnerMenuItemInput,
  type OwnerPortfolioItemInput,
  type OwnerProductInput,
  type OwnerServiceInput,
} from "./owner-content";
export {
  buildEngineContentBlocks,
  mapGeneratedPageToEngineInput,
  pageGeneratorAdapter,
  toCanonicalPageDocument,
  type CanonicalDocumentResult,
  type GeneratedPageAdapterOptions,
  type GeneratedPageEngineMappingFailure,
  type GeneratedPageEngineMappingResult,
  type GeneratedPageEngineMappingSuccess,
} from "./adapter";
export {
  createGeneratedPage,
  type CreateGeneratedPageFailure,
  type CreateGeneratedPageFailureCode,
  type CreateGeneratedPageInput,
  type CreateGeneratedPageResult,
  type CreateGeneratedPageSuccess,
  type GeneratedPageEngineRequest,
} from "./create-page";
// The Smart Pages host map imports the server-only Engine V2 entrypoint. Keep
// it out of this client-safe barrel; server callers import the seam directly
// from `./smart-pages-host-map` (or from the onboarding server adapter).
export {
  mapRetailPresentationToHostInput,
  reconcileRetailGeneratedConfig,
  type SmartPagesRetailDiagnostics,
  type SmartPagesRetailMappingFailure,
  type SmartPagesRetailMappingResult,
  type SmartPagesRetailMappingSuccess,
} from "./smart-pages-retail-map";
