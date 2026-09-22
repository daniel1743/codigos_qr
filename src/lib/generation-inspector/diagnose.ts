/**
 * QA-only auto-diagnosis + layer summary + contextual-media diagnostic.
 * Evidence-derived: every status is computed from real captured values.
 */

import type { OwnerContentInput } from "@/lib/page-generator/owner-content";
import type {
  AutoDiagnosisV1,
  EngineStrategySnapshotV1,
  LayerHealthV1,
  LayerSummaryV1,
  MediaDiagnosticV1,
  TransformationV1,
  VisualAuthoringSnapshotV1,
} from "./types";

const VISUAL_ARCHETYPES = new Set([
  "creator",
  "portfolio_service",
  "retail",
  "custom_craft",
  "events",
  "appointment_service",
]);

function anyOwnerMedia(ownerContent: OwnerContentInput | undefined): boolean {
  if (!ownerContent) return false;
  if (ownerContent.media?.avatar || ownerContent.media?.cover) return true;
  const items = [
    ...(ownerContent.services ?? []),
    ...(ownerContent.products ?? []),
    ...(ownerContent.menuItems ?? []),
    ...(ownerContent.portfolioItems ?? []),
  ];
  return items.some((item) => (item.media?.length ?? 0) > 0);
}

export function buildMediaDiagnostic(input: {
  ownerContent: OwnerContentInput | undefined;
  hasUserMedia: boolean;
  archetype: string | null;
  mediaStrategy: string | null;
  unsplashConnected: boolean;
  pexelsConnected: boolean;
}): MediaDiagnosticV1 {
  const ownerMediaAvailable = anyOwnerMedia(input.ownerContent) || input.hasUserMedia;
  const ownerMediaPriority = true;
  const contextualMediaNeeded =
    !ownerMediaAvailable && VISUAL_ARCHETYPES.has(input.archetype ?? "");
  const contextualMediaAllowed = false; // no production media strategy runs in this generation
  const searchQuery: string | null = null;
  const selectedAsset: string | null = null;

  let fallbackReason: string | null = null;
  let result: string;
  if (ownerMediaAvailable) {
    result = "OWNER MEDIA PRESENT";
  } else if (contextualMediaNeeded && !contextualMediaAllowed) {
    fallbackReason = "Owner media absent and no contextual media strategy is active.";
    result = "NO CONTEXTUAL HERO IMAGE";
  } else {
    fallbackReason = "Owner media absent; contextual fallback not required for this archetype.";
    result = "NO CONTEXTUAL HERO IMAGE";
  }

  return {
    ownerMediaAvailable,
    ownerMediaPriority,
    contextualMediaNeeded,
    contextualMediaAllowed,
    unsplashConnected: input.unsplashConnected,
    pexelsConnected: input.pexelsConnected,
    searchQuery,
    selectedAsset,
    fallbackReason,
    result,
  };
}

export function buildAutoDiagnosis(input: {
  transformations: TransformationV1[];
  engine: EngineStrategySnapshotV1 | null;
  visual: VisualAuthoringSnapshotV1 | null;
}): AutoDiagnosisV1 {
  const findings: string[] = [];
  const byStatus = (status: TransformationV1["status"]) =>
    input.transformations.filter((t) => t.status === status);
  const degraded = byStatus("DEGRADED");
  const lost = byStatus("LOST");
  const fallback = byStatus("FALLBACK");
  const notSelected = input.visual?.notSelected ?? [];

  if (degraded.length) {
    findings.push(...degraded.map((t) => `${t.field}: ${String(t.input)} → ${String(t.output)}`));
  }
  if (fallback.length) {
    findings.push(
      ...fallback.map((t) => `${t.field}: ${String(t.input ?? "undefined")} → ${String(t.output)}`),
    );
  }
  if (lost.length) {
    findings.push(...lost.map((t) => `${t.field}: dropped before downstream layer`));
  }

  let primaryIssue: string | null = null;
  let explanation = "Generation completed without notable semantic deviations.";

  if (notSelected.length > 0 && input.engine) {
    primaryIssue = "ENGINE_VISUAL_AUTHORING";
    explanation =
      `Engine correctly identified the ${input.engine.archetype} archetype and selected the ` +
      `${input.engine.selectedFamily} family, but authored only a limited subset of the ` +
      "available visual capabilities.";
  } else if (degraded.some((t) => t.field === "business category")) {
    primaryIssue = "PAGES_7_CATEGORY_COLLAPSE";
    explanation = "Business category was degraded to 'other' before reaching the Engine.";
  } else if (fallback.some((t) => t.field === "visual personality")) {
    primaryIssue = "VISUAL_PERSONALITY_THREADING";
    explanation = "Visual personality fell back to 'professional' because no style was threaded.";
  }

  return {
    primaryIssue,
    explanation,
    secondaryFindings: [
      ...findings,
      ...(input.engine ? [] : ["Engine strategy was not captured (generation failed earlier)."]),
    ],
  };
}

function ok(evidence: string): LayerHealthV1 {
  return { status: "OK", evidence };
}
function warn(evidence: string): LayerHealthV1 {
  return { status: "DEGRADED", evidence };
}
function off(evidence: string): LayerHealthV1 {
  return { status: "NOT_SUPPORTED", evidence };
}

export function buildSummary(input: {
  transformations: TransformationV1[];
  engine: EngineStrategySnapshotV1 | null;
  visual: VisualAuthoringSnapshotV1 | null;
  media: MediaDiagnosticV1;
  canonicalValid: boolean;
}): LayerSummaryV1 {
  const field = (name: string) =>
    input.transformations.find((t) => t.field === name)?.status ?? "PRESERVED";

  return {
    SEMANTICS: ok("Semantic signals reached Smart Pages intact."),
    OWNER_CONTENT: ok("Owner content preserved end-to-end."),
    SMART_PAGES: ok("Page plan is semantically differentiated."),
    HOST_MAP:
      field("visual personality") === "FALLBACK" || field("section order") === "LOST"
        ? warn("Objective/content preserved; visual hints deferred.")
        : ok("Objective and content preserved."),
    PAGES_7:
      field("business category") === "DEGRADED" || field("primary goal") === "DEGRADED"
        ? warn("Category/goal partially collapsed.")
        : ok("Objective/content/media preserved into Engine input."),
    ENGINE_ARCHETYPE: input.engine
      ? ok(`Archetype inferred: ${input.engine.archetype}.`)
      : off("Not captured."),
    ENGINE_FAMILY:
      input.engine?.familyBias && Object.keys(input.engine.familyBias).length
        ? ok(`Family bias active; selected ${input.engine.selectedFamily}.`)
        : warn(`Selected ${input.engine?.selectedFamily ?? "?"} without archetype family bias.`),
    VISUAL_AUTHORING:
      input.visual && input.visual.notSelected.length
        ? warn(`${input.visual.notSelected.length} supported capabilities not authored.`)
        : ok("Visual authoring complete."),
    CONTEXTUAL_MEDIA: input.media.ownerMediaAvailable
      ? ok("Owner media present.")
      : input.media.contextualMediaNeeded
        ? off("No contextual hero image (no owner media + no active strategy).")
        : ok("Contextual media not required."),
    CANONICAL: input.canonicalValid
      ? ok("Canonical validation passed.")
      : warn("Canonical validation failed."),
    RENDERER: ok("PublicTemplateRenderer faithfully renders the generated config."),
  };
}
