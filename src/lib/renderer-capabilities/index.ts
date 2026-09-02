export {
  ACTIVE_RENDERER_TEMPLATE_IDS,
  KNOWN_LEGACY_RENDERER_TEMPLATE_IDS,
  TEMPLATE_RENDERER_CAPABILITIES,
  explainRendererCapability,
  getRendererCapabilities,
  isRendererCapabilitySupported,
  validateRendererRequirements,
} from "./capabilities.ts";
export { toEngineRendererCapabilities } from "./engineProjection.ts";
export type { ActiveRendererTemplateId } from "./capabilities.ts";
export type {
  CapabilityState,
  CapabilityStatus,
  CripqerRendererCapabilitiesV1,
  EngineRendererCapabilitiesProjectionV1,
  EnumeratedRendererCapabilityV1,
  RenderabilityRequirementV1,
  RendererKindV1,
  RendererRequirementsValidationV1,
  RendererRuntimeContextV1,
} from "./types.ts";
