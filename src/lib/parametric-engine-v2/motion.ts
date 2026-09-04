/**
 * V1.5 — motion/interaction future contract.
 *
 * Pure semantic tokens. No generated CSS. Disabled until the renderer
 * declares `motion_tokens`. Reduced motion ALWAYS overrides animation.
 */

import type { FutureRendererCapabilitiesV1 } from "./future-capabilities";
import type { FamilyId } from "./types";

export const MOTION_LEVELS = ["none", "subtle", "expressive"] as const;
export type MotionLevel = (typeof MOTION_LEVELS)[number];

export const HOVER_TOKENS = ["none", "lift", "fade", "soft_scale"] as const;
export type HoverToken = (typeof HOVER_TOKENS)[number];

export const ENTRANCE_TOKENS = ["none", "fade", "fade_up"] as const;
export type EntranceToken = (typeof ENTRANCE_TOKENS)[number];

export interface MotionStrategyV1 {
  motion_level: MotionLevel;
  hover: HoverToken;
  entrance: EntranceToken;
  /** Contract reminder for the renderer; the engine never animates. */
  respect_reduced_motion: true;
}

export const NO_MOTION: MotionStrategyV1 = {
  motion_level: "none",
  hover: "none",
  entrance: "none",
  respect_reduced_motion: true,
};

const FAMILY_MOTION: Record<FamilyId, MotionStrategyV1> = {
  editorial: { motion_level: "subtle", hover: "fade", entrance: "fade", respect_reduced_motion: true },
  luxury: { motion_level: "subtle", hover: "fade", entrance: "fade_up", respect_reduced_motion: true },
  corporate: { motion_level: "subtle", hover: "lift", entrance: "fade", respect_reduced_motion: true },
  minimal: { motion_level: "none", hover: "none", entrance: "none", respect_reduced_motion: true },
  creator: { motion_level: "expressive", hover: "soft_scale", entrance: "fade_up", respect_reduced_motion: true },
  energetic: { motion_level: "expressive", hover: "lift", entrance: "fade_up", respect_reduced_motion: true },
};

/** Returns null unless the renderer declares motion token support. */
export function buildMotionStrategy(
  family: FamilyId,
  future: FutureRendererCapabilitiesV1,
  reducedMotion = false,
): MotionStrategyV1 | null {
  if (future.motion_tokens !== true) return null;
  if (reducedMotion) return NO_MOTION;
  return { ...FAMILY_MOTION[family] };
}
