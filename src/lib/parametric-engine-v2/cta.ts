/**
 * Canonical CTA contract. The engine never invents labels.
 */

import type { CanonicalCtaLabel, PrimaryActionType, PrimaryGoal } from "./types";

const BY_ACTION: Record<PrimaryActionType, CanonicalCtaLabel> = {
  whatsapp: "Más información",
  booking: "Reservar",
  website: "Visitar",
  instagram: "Visitar",
  email: "Más información",
};

/**
 * Goal refines the label only where the canonical set allows it.
 * Deterministic: action type first, goal as a narrow override.
 */
export function resolveCtaLabel(
  action: PrimaryActionType,
  goal: PrimaryGoal,
): CanonicalCtaLabel {
  if (goal === "booking") return "Reservar";
  if (goal === "portfolio" && (action === "website" || action === "instagram")) {
    return "Ver mi trabajo";
  }
  return BY_ACTION[action];
}

/**
 * Deterministic conversion priority order. The primary action always leads;
 * the rest follow a fixed goal-driven order with a stable tie-break.
 */
const GOAL_ORDER: Record<PrimaryGoal, PrimaryActionType[]> = {
  whatsapp: ["whatsapp", "email", "booking", "website", "instagram"],
  booking: ["booking", "whatsapp", "website", "email", "instagram"],
  sell: ["whatsapp", "website", "booking", "email", "instagram"],
  leads: ["email", "whatsapp", "booking", "website", "instagram"],
  portfolio: ["website", "instagram", "email", "whatsapp", "booking"],
  social: ["instagram", "website", "whatsapp", "email", "booking"],
};

export function resolvePriorityOrder(
  goal: PrimaryGoal,
  primary: PrimaryActionType,
): PrimaryActionType[] {
  const base = GOAL_ORDER[goal];
  return [primary, ...base.filter((a) => a !== primary)];
}
