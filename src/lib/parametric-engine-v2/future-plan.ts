/**
 * V1.5 — FutureCompositionPlanV1.
 *
 * A DORMANT planning contract. It is NOT PageRecipeV1 and the current
 * renderer must not consume it automatically.
 */

import { getArchetypeStrategy } from "./archetypes";
import { resolveBusinessSignals, type BusinessSignalsV1 } from "./business-signals";
import { selectCompositionPattern, type CompositionPattern } from "./composition-patterns";
import {
  resolveContentInventory,
  type ContentInventoryPatch,
  type ContentKey,
} from "./content-inventory";
import {
  resolveFutureCapabilities,
  supportsAll,
  type FutureCapabilityKey,
  type FutureRendererCapabilitiesV1,
} from "./future-capabilities";
import {
  FUTURE_BLOCKS,
  contentSatisfied,
  signalsFavor,
  type FutureBlockType,
} from "./future-blocks";
import {
  FUTURE_BLOCK_EXCLUSIONS,
  evaluateBlockConstraints,
  resolveExclusion,
} from "./future-constraints";
import {
  assertValidEngineContext,
  clampInt,
  validateFutureCapabilities,
  throwIfInvalid,
} from "./runtime-validation";
import { normalizeIntent, validateIntent } from "./normalize";
import type { NormalizedIntent, OnboardingIntentV1 } from "./types";
import { EngineError } from "./types";

export interface FutureBlockPlanEntry {
  type: FutureBlockType;
  order: number;
  score: number;
  status:
    | "recommended"
    | "blocked_capability"
    | "blocked_content"
    | "blocked_constraint"
    | "blocked_exclusion"
    | "not_useful";
  required_capabilities: FutureCapabilityKey[];
  required_content: ContentKey[];
  suggested_variant: string;
  reasons: string[];
}

export interface FutureCompositionPlanV1 {
  plan_version: "1";
  engine_version: string;
  archetype: BusinessSignalsV1["archetype"];
  signals: BusinessSignalsV1;
  composition_pattern: CompositionPattern;
  /** Blocks the renderer may emit today (capability + content satisfied). */
  recommended_blocks: FutureBlockPlanEntry[];
  /** Everything evaluated, including blocked entries and their reasons. */
  evaluated_blocks: FutureBlockPlanEntry[];
  missing_capabilities: FutureCapabilityKey[];
  missing_content: ContentKey[];
}

export interface FuturePlanOptions {
  business?: Partial<BusinessSignalsV1>;
  content?: ContentInventoryPatch;
  capabilities?: Partial<FutureRendererCapabilitiesV1>;
  variant?: number;
}

function planFor(
  normalized: NormalizedIntent,
  rawOptions: FuturePlanOptions,
): FutureCompositionPlanV1 {
  const options: FuturePlanOptions =
    rawOptions && typeof rawOptions === "object" && !Array.isArray(rawOptions) ? rawOptions : {};
  assertValidEngineContext({
    business: options.business,
    content: options.content,
    future_capabilities: options.capabilities,
  });
  throwIfInvalid("INVALID_OPTIONS", validateFutureCapabilities(options.capabilities));
  const signals = resolveBusinessSignals(normalized, options.business);
  const strategy = getArchetypeStrategy(signals);
  const content = resolveContentInventory(options.content);
  const capabilities = resolveFutureCapabilities(options.capabilities);
  const variant = clampInt(options.variant, { min: 0, max: 999, fallback: 0 });

  const pattern = selectCompositionPattern({
    intent: normalized,
    signals,
    strategy,
    content,
    variant,
  });

  const missingCapabilities = new Set<FutureCapabilityKey>();
  const missingContent = new Set<ContentKey>();

  const evaluated: FutureBlockPlanEntry[] = Object.values(FUTURE_BLOCKS).map((block) => {
    const priorityIndex = strategy.future_block_priority.indexOf(block.type);
    const favored = signalsFavor(block, signals);
    const hasContentAvailable = contentSatisfied(block, content);
    const hasCapability = supportsAll(capabilities, block.required_capabilities);
    const constraint = evaluateBlockConstraints(block.type, { content, signals });

    const reasons: string[] = [];
    if (priorityIndex >= 0) reasons.push(`archetype:${signals.archetype}:priority_${priorityIndex}`);
    if (favored) reasons.push("signals_favor");
    if (!hasCapability) {
      reasons.push("capability_missing");
      block.required_capabilities
        .filter((key) => capabilities[key] !== true)
        .forEach((key) => missingCapabilities.add(key));
    }
    if (!hasContentAvailable) {
      reasons.push("content_missing");
      block.required_content
        .filter((key) => (content[key] as { available: boolean }).available !== true)
        .forEach((key) => missingContent.add(key));
    }

    const priorityScore = priorityIndex >= 0 ? 60 - priorityIndex * 5 : 0;
    const score = Math.max(
      0,
      Math.min(
        100,
        priorityScore + (favored ? 25 : 0) + (hasContentAvailable ? 15 : 0),
      ),
    );

    if (!constraint.satisfied) reasons.push(...constraint.reasons);

    const status: FutureBlockPlanEntry["status"] =
      priorityIndex < 0 && !favored
        ? "not_useful"
        : !hasCapability
          ? "blocked_capability"
          : !hasContentAvailable
            ? "blocked_content"
            : !constraint.satisfied
              ? "blocked_constraint"
              : "recommended";

    return {
      type: block.type,
      order: block.base_order,
      score,
      status,
      required_capabilities: [...block.required_capabilities],
      required_content: [...block.required_content],
      suggested_variant: block.allowed_variants[0] ?? "default",
      reasons,
    };
  });

  const sorted = [...evaluated].sort((a, b) =>
    a.order === b.order ? (b.score - a.score || a.type.localeCompare(b.type)) : a.order - b.order,
  );

  // Mutually exclusive blocks: keep the deterministically higher-value one.
  for (const rule of FUTURE_BLOCK_EXCLUSIONS) {
    const a = sorted.find((e) => e.type === rule.a);
    const b = sorted.find((e) => e.type === rule.b);
    if (!a || !b || a.status !== "recommended" || b.status !== "recommended") continue;
    const winner = resolveExclusion(rule.a, rule.b, signals);
    const loser = winner === rule.a ? b : a;
    loser.status = "blocked_exclusion";
    loser.reasons.push(`exclusive_with:${winner}`);
  }

  return {
    plan_version: "1",
    engine_version: "1.5.1",
    archetype: signals.archetype,
    signals,
    composition_pattern: pattern,
    recommended_blocks: sorted.filter((entry) => entry.status === "recommended"),
    evaluated_blocks: sorted,
    missing_capabilities: [...missingCapabilities].sort(),
    missing_content: [...missingContent].sort(),
  };
}

/** Deterministic future planning surface. Never mutates PageRecipeV1. */
export function buildFutureCompositionPlan(
  intent: OnboardingIntentV1,
  options: FuturePlanOptions = {},
): FutureCompositionPlanV1 {
  const issues = validateIntent(intent);
  if (issues.length > 0) {
    throw new EngineError("INVALID_INTENT", "OnboardingIntentV1 is invalid.", issues);
  }
  return planFor(normalizeIntent(intent), options ?? {});
}

export function buildFutureCompositionPlanFromNormalized(
  normalized: NormalizedIntent,
  options: FuturePlanOptions = {},
): FutureCompositionPlanV1 {
  return planFor(normalized, options ?? {});
}
