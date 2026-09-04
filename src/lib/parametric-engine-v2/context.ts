/**
 * V1.5 — optional engine context.
 *
 * Everything here is OPTIONAL. generatePageRecipe(intent) with no context
 * behaves exactly like V1.
 */

import { getArchetypeStrategy, type ArchetypeStrategy } from "./archetypes";
import {
  normalizeGoalStack,
  resolveBusinessSignals,
  type BusinessSignalsV1,
  type GoalStackV1,
} from "./business-signals";
import {
  resolveContentInventory,
  type ContentInventoryPatch,
  type ContentInventoryV1,
} from "./content-inventory";
import {
  resolveFutureCapabilities,
  type FutureRendererCapabilitiesV1,
} from "./future-capabilities";
import type { NormalizedIntent } from "./types";

export interface EngineContextV1 {
  business?: Partial<BusinessSignalsV1>;
  content?: ContentInventoryPatch;
  goals?: Partial<GoalStackV1>;
  future_capabilities?: Partial<FutureRendererCapabilitiesV1>;
}

export interface ResolvedContext {
  signals: BusinessSignalsV1;
  strategy: ArchetypeStrategy;
  content: ContentInventoryV1;
  goals: GoalStackV1;
  future: FutureRendererCapabilitiesV1;
}

export function resolveEngineContext(
  intent: NormalizedIntent,
  context?: EngineContextV1,
): ResolvedContext {
  const signals = resolveBusinessSignals(intent, context?.business);
  return {
    signals,
    strategy: getArchetypeStrategy(signals),
    content: resolveContentInventory(context?.content),
    goals: normalizeGoalStack(intent.primary_goal, context?.goals),
    future: resolveFutureCapabilities(context?.future_capabilities),
  };
}
