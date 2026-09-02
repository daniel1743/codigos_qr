/**
 * V1.5 — semantic recipe diff.
 */

import { assertRecipeShape, fingerprintRecipe } from "./fingerprint";
import type { PageRecipeV1 } from "./types";

export interface RecipeDiffEntry {
  path: string;
  from: unknown;
  to: unknown;
  /** Coarse grouping so an editor can explain the change. */
  group: "meta" | "identity" | "design" | "structure" | "blocks" | "conversion";
}

export interface RecipeDiffV1 {
  identical: boolean;
  from_fingerprint: string;
  to_fingerprint: string;
  changes: RecipeDiffEntry[];
}

function groupOf(path: string): RecipeDiffEntry["group"] {
  const head = path.split(".")[0] ?? "meta";
  return (["meta", "identity", "design", "structure", "blocks", "conversion"] as const).includes(
    head as never,
  )
    ? (head as RecipeDiffEntry["group"])
    : "meta";
}

function walk(
  a: unknown,
  b: unknown,
  path: string,
  out: RecipeDiffEntry[],
): void {
  if (path === "meta.generated_at") return;
  const bothObjects =
    a && b && typeof a === "object" && typeof b === "object" && Array.isArray(a) === Array.isArray(b);
  if (!bothObjects) {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out.push({ path, from: a, to: b, group: groupOf(path) });
    }
    return;
  }
  const keys = [
    ...new Set([
      ...Object.keys(a as Record<string, unknown>),
      ...Object.keys(b as Record<string, unknown>),
    ]),
  ].sort();
  for (const key of keys) {
    walk(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
      path ? `${path}.${key}` : key,
      out,
    );
  }
}

/** Describes semantic differences between two recipes (ignores generated_at). */
export function diffRecipes(a: PageRecipeV1, b: PageRecipeV1): RecipeDiffV1 {
  assertRecipeShape(a, "from_recipe");
  assertRecipeShape(b, "to_recipe");
  const changes: RecipeDiffEntry[] = [];
  walk(a, b, "", changes);
  return {
    identical: changes.length === 0,
    from_fingerprint: fingerprintRecipe(a),
    to_fingerprint: fingerprintRecipe(b),
    changes,
  };
}
