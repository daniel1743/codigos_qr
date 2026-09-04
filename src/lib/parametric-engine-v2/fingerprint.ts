/**
 * V1.5 — recipe fingerprint, diff and renderer compatibility checking.
 */

import { EngineError, type PageRecipeV1, type RendererCapabilitiesV1 } from "./types";
import { stableHash } from "./utils";

/**
 * V1.5.1 — these helpers are PUBLIC and expected to receive stored JSON, so
 * they validate the minimal recipe shape before dereferencing anything.
 */
export function assertRecipeShape(recipe: unknown, label = "recipe"): asserts recipe is PageRecipeV1 {
  const r = recipe as Record<string, unknown> | null;
  const ok =
    !!r &&
    typeof r === "object" &&
    !Array.isArray(r) &&
    typeof r["meta"] === "object" &&
    r["meta"] !== null &&
    typeof r["design"] === "object" &&
    r["design"] !== null &&
    typeof r["structure"] === "object" &&
    r["structure"] !== null &&
    Array.isArray(r["blocks"]);
  if (!ok) {
    throw new EngineError("INVALID_RECIPE", `${label} is not a PageRecipeV1 object.`, [
      { path: label, code: "shape", message: `${label} must be a PageRecipeV1 object.` },
    ]);
  }
}

/** Stable JSON with sorted keys; excludes volatile metadata. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(",")}}`;
}

function withoutVolatile(recipe: PageRecipeV1): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(recipe)) as Record<string, unknown>;
  const meta = { ...(clone["meta"] as Record<string, unknown>) };
  delete meta["generated_at"];
  clone["meta"] = meta;
  return clone;
}

/** Structural fingerprint. Identical structure => identical fingerprint. */
export function fingerprintRecipe(recipe: PageRecipeV1): string {
  assertRecipeShape(recipe);
  const canonical = stableStringify(withoutVolatile(recipe));
  const a = stableHash(canonical).toString(16).padStart(8, "0");
  const b = stableHash(`${canonical}|salt`).toString(16).padStart(8, "0");
  return `r1_${a}${b}`;
}

export function canonicalRecipeJson(recipe: PageRecipeV1): string {
  assertRecipeShape(recipe);
  return stableStringify(withoutVolatile(recipe));
}

export interface RecipeCompatibilityReport {
  compatible: boolean;
  unsupported: string[];
}

/** Detects whether a stored recipe needs capabilities a renderer lacks. */
export function checkRecipeRendererCompatibility(
  recipe: PageRecipeV1,
  capabilities: RendererCapabilitiesV1,
): RecipeCompatibilityReport {
  assertRecipeShape(recipe);
  if (!capabilities || typeof capabilities !== "object" || Array.isArray(capabilities)) {
    throw new EngineError("INVALID_OPTIONS", "capabilities must be an object.", [
      { path: "capabilities", code: "shape", message: "capabilities must be an object." },
    ]);
  }
  const unsupported: string[] = [];
  const need = (ok: boolean, key: string) => {
    if (!ok) unsupported.push(key);
  };

  if (recipe.design.card.enabled) need(capabilities.professional_cards, "professional_cards");
  if (recipe.design.card.media_position === "right") need(capabilities.card_media_right, "card_media_right");
  if (recipe.design.card.media_position === "bottom") need(capabilities.card_media_bottom, "card_media_bottom");
  if (recipe.design.card.style === "elevated") need(capabilities.elevated_cards, "elevated_cards");
  if (recipe.design.background.type === "radial-gradient") need(capabilities.radial_background, "radial_background");
  if (recipe.design.background.type === "linear-gradient") need(capabilities.gradient_background, "gradient_background");
  if (recipe.structure.hero.show_professional_badge) need(capabilities.professional_badge, "professional_badge");
  if (recipe.structure.social_row.enabled) need(capabilities.social_links, "social_links");
  if (recipe.structure.hero.mode !== "avatar_only") need(capabilities.hero_banner, "hero_banner");
  if (recipe.blocks.some((b) => b.type === "media")) need(capabilities.media_block, "media_block");

  return { compatible: unsupported.length === 0, unsupported: [...new Set(unsupported)].sort() };
}
