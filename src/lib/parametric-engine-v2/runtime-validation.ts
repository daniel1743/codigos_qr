/**
 * V1.5.1 — runtime validation boundary.
 *
 * TypeScript types are erased at runtime. Every public V1.5 API that accepts
 * caller-supplied JSON-like data routes it through this module first, so an
 * invalid enum, NaN count or malformed object produces a CONTROLLED engine
 * error instead of an uncontrolled TypeError deep inside generation.
 *
 * Pure, synchronous, dependency-free.
 */

import { BUSINESS_SIGNAL_ENUMS, businessSignalIssues } from "./business-signals";
import type { ContentInventoryPatch, ContentKey } from "./content-inventory";
import { CONTENT_KEYS, MAX_CONTENT_COUNT } from "./content-inventory";
import { FUTURE_CAPABILITY_KEYS } from "./future-capabilities";
import { DESIGN_PRESETS_IDS, type DesignPresetId } from "./presets";
import {
  EngineError,
  FAMILY_IDS,
  HERO_MODES,
  OVERRIDE_KEYS,
  PRIMARY_GOALS,
  type ValidationIssue,
} from "./types";

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function issue(path: string, code: string, message: string): ValidationIssue {
  return { path, code, message };
}

export function throwIfInvalid(
  code: "INVALID_CONTEXT" | "INVALID_OPTIONS",
  issues: ValidationIssue[],
): void {
  if (issues.length > 0) {
    throw new EngineError(code, `${issues.length} invalid runtime input(s).`, issues);
  }
}

/* ---------------------------------------------------------------- numbers */

export interface IntBounds {
  min: number;
  max: number;
  fallback: number;
}

/** Deterministically clamps a caller integer. NaN/Infinity => fallback. */
export function clampInt(value: unknown, bounds: IntBounds): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return bounds.fallback;
  const truncated = Math.trunc(value);
  if (truncated < bounds.min) return bounds.min;
  if (truncated > bounds.max) return bounds.max;
  return truncated;
}

/** Non-negative bounded count used by the content inventory. */
export function safeCount(value: unknown, max = MAX_CONTENT_COUNT): number | null {
  if (value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const truncated = Math.trunc(value);
  if (truncated < 0) return null;
  return Math.min(truncated, max);
}

/* -------------------------------------------------------- business signals */

/** Validates a caller-supplied partial BusinessSignalsV1. */
export function validateBusinessSignalsPatch(patch: unknown, base = "business"): ValidationIssue[] {
  return businessSignalIssues(patch, base);
}

export { BUSINESS_SIGNAL_ENUMS };

/* ------------------------------------------------------- content inventory */

export function validateContentInventoryPatch(patch: unknown, base = "content"): ValidationIssue[] {
  if (patch === undefined || patch === null) return [];
  if (!isPlainObject(patch)) {
    return [issue(base, "not_an_object", `${base} must be an object.`)];
  }
  const issues: ValidationIssue[] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (!CONTENT_KEYS.includes(key as ContentKey)) {
      issues.push(issue(`${base}.${key}`, "unknown_key", `${key} is not a content slot.`));
      continue;
    }
    if (!isPlainObject(value)) {
      issues.push(issue(`${base}.${key}`, "not_an_object", `${key} must be an object.`));
      continue;
    }
    if (value["available"] !== undefined && typeof value["available"] !== "boolean") {
      issues.push(issue(`${base}.${key}.available`, "type", "available must be a boolean."));
    }
    if (value["count"] !== undefined) {
      const count = value["count"];
      if (typeof count !== "number" || !Number.isFinite(count) || Math.trunc(count) < 0) {
        issues.push(
          issue(`${base}.${key}.count`, "count", "count must be a finite integer >= 0."),
        );
      } else if (Math.trunc(count) > MAX_CONTENT_COUNT) {
        issues.push(
          issue(
            `${base}.${key}.count`,
            "count_too_large",
            `count must be <= ${MAX_CONTENT_COUNT}.`,
          ),
        );
      }
    }
    if (value["has_prices"] !== undefined && typeof value["has_prices"] !== "boolean") {
      issues.push(issue(`${base}.${key}.has_prices`, "type", "has_prices must be a boolean."));
    }
  }
  return issues;
}

/* ------------------------------------------------------------ capabilities */

export function validateFutureCapabilities(patch: unknown, base = "future_capabilities"): ValidationIssue[] {
  if (patch === undefined || patch === null) return [];
  if (!isPlainObject(patch)) {
    return [issue(base, "not_an_object", `${base} must be an object.`)];
  }
  const issues: ValidationIssue[] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (!FUTURE_CAPABILITY_KEYS.includes(key as never)) {
      issues.push(issue(`${base}.${key}`, "unknown_key", `${key} is not a future capability.`));
      continue;
    }
    if (typeof value !== "boolean") {
      issues.push(issue(`${base}.${key}`, "type", `${key} must be a boolean.`));
    }
  }
  return issues;
}

export function validateRendererCapabilities(patch: unknown, base = "capabilities"): ValidationIssue[] {
  if (patch === undefined || patch === null) return [];
  if (!isPlainObject(patch)) {
    return [issue(base, "not_an_object", `${base} must be an object.`)];
  }
  return Object.entries(patch)
    .filter(([, value]) => value !== undefined && typeof value !== "boolean")
    .map(([key]) => issue(`${base}.${key}`, "type", `${key} must be a boolean.`));
}

/* ------------------------------------------------------------- goal stack */

export function validateGoalStack(patch: unknown, base = "goals"): ValidationIssue[] {
  if (patch === undefined || patch === null) return [];
  if (!isPlainObject(patch)) {
    return [issue(base, "not_an_object", `${base} must be an object.`)];
  }
  const issues: ValidationIssue[] = [];
  for (const key of ["primary", "secondary", "tertiary"] as const) {
    const value = patch[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string" || !PRIMARY_GOALS.includes(value as never)) {
      issues.push(issue(`${base}.${key}`, "enum", `${key} is not a supported goal.`));
    }
  }
  return issues;
}

/* --------------------------------------------------------------- context */

export function validateEngineContext(context: unknown): ValidationIssue[] {
  if (context === undefined || context === null) return [];
  if (!isPlainObject(context)) {
    return [issue("context", "not_an_object", "context must be an object.")];
  }
  return [
    ...validateBusinessSignalsPatch(context["business"], "context.business"),
    ...validateContentInventoryPatch(context["content"], "context.content"),
    ...validateGoalStack(context["goals"], "context.goals"),
    ...validateFutureCapabilities(context["future_capabilities"], "context.future_capabilities"),
  ];
}

/** Throws EngineError('INVALID_CONTEXT') when the context is malformed. */
export function assertValidEngineContext(context: unknown): void {
  throwIfInvalid("INVALID_CONTEXT", validateEngineContext(context));
}

/* --------------------------------------------------------------- overrides */

export function validateDesignOverrides(overrides: unknown, base = "overrides"): ValidationIssue[] {
  if (overrides === undefined || overrides === null) return [];
  if (!isPlainObject(overrides)) {
    return [issue(base, "not_an_object", `${base} must be an object.`)];
  }
  const issues: ValidationIssue[] = [];
  const enums: Record<string, readonly string[]> = {
    hero_mode: HERO_MODES,
    links_presentation: ["buttons", "cards", "mixed"],
    identity_alignment: ["left", "center"],
    density: ["compact", "balanced", "spacious"],
    card_media_position: ["right", "bottom"],
    visual_family: FAMILY_IDS,
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null) continue;
    if (key === "locked") {
      if (!Array.isArray(value)) {
        issues.push(issue(`${base}.locked`, "type", "locked must be an array."));
        continue;
      }
      for (const entry of value) {
        if (typeof entry !== "string" || !OVERRIDE_KEYS.includes(entry as never)) {
          issues.push(issue(`${base}.locked`, "enum", `${String(entry)} is not an override key.`));
        }
      }
      continue;
    }
    const allowed = enums[key];
    if (!allowed) {
      issues.push(issue(`${base}.${key}`, "unknown_key", `${key} is not an override key.`));
      continue;
    }
    if (typeof value !== "string" || !allowed.includes(value)) {
      issues.push(issue(`${base}.${key}`, "enum", `${key} must be one of: ${allowed.join(", ")}.`));
    }
  }
  return issues;
}

/* ----------------------------------------------------------------- presets */

export function isKnownPreset(id: unknown): id is DesignPresetId {
  return typeof id === "string" && DESIGN_PRESETS_IDS.includes(id as DesignPresetId);
}

export function validatePresetIds(ids: unknown, base = "presets"): ValidationIssue[] {
  if (ids === undefined || ids === null) return [];
  if (!Array.isArray(ids)) return [issue(base, "type", `${base} must be an array.`)];
  return ids
    .filter((id) => !isKnownPreset(id))
    .map((id) => issue(base, "unknown_preset", `${String(id)} is not a known preset id.`));
}
