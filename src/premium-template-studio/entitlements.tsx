/**
 * CRIPQER — POWER EDITOR ENTITLEMENT ENFORCEMENT
 *
 * React bindings + pure intent mapping over the frozen Product Entitlement
 * cores. Components use the hooks to (a) read the effective tier and (b) render
 * / disable premium controls with a Pro lock indicator — WITHOUT duplicating the
 * Free/Pro matrix. The pure `mutationIntentForAction` is used by the guarded
 * dispatch boundary in StudioProvider.
 *
 * All tiers enter the SAME editor. A LOCKED capability is VISIBLE but not
 * mutable; it never hides existing rendered values, never resets them, and never
 * strips them from the canonical config.
 */

import { useMemo } from "react";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useStudio } from "./state/StudioProvider";
import type { ProductTier, ProductCapability } from "../lib/product-entitlements/capabilities";
import { resolveCapabilityAccess } from "../lib/product-entitlements/capabilities";
import { resolveAssetEntitlement } from "../lib/product-entitlements/asset-manifest";
import type { AssetEntitlement, ProductAssetKind } from "../lib/product-entitlements/asset-manifest";
import { getBlockEntitlement } from "../lib/product-entitlements/asset-manifest";
import type { MutationIntent } from "../lib/product-entitlements/mutation-guard";
import { authorizeCanonicalMutation } from "../lib/product-entitlements/mutation-guard";
import type { StudioAction, StudioState } from "./state/templateReducer";

export type { ProductTier, ProductCapability };

/* ------------------------------------------------------------------ */
/* Pure helpers (safe inside list .map())                             */
/* ------------------------------------------------------------------ */

export function isCapabilityLocked(tier: ProductTier, capability: ProductCapability): boolean {
  return resolveCapabilityAccess(tier, capability).state !== "ALLOW";
}

export function isAssetLocked(kind: ProductAssetKind, id: string, tier: ProductTier): boolean {
  const entitlement = resolveAssetEntitlement(kind, id);
  if (entitlement.classification !== "PREMIUM") return false;
  if (!entitlement.requiredCapability) return false;
  return resolveCapabilityAccess(tier, entitlement.requiredCapability).state !== "ALLOW";
}

/* ------------------------------------------------------------------ */
/* Field-scoped path → mutation intent                                */
/* ------------------------------------------------------------------ */

export function intentForConfigPath(path: string): MutationIntent | null {
  if (path === "motion" || path.startsWith("motion.")) return { kind: "EDIT_ADVANCED_MOTION" };
  if (path === "theme.typography" || path.startsWith("theme.typography."))
    return { kind: "EDIT_ADVANCED_TYPOGRAPHY" };
  if (path === "theme.background" || path.startsWith("theme.background."))
    return { kind: "EDIT_PREMIUM_BACKGROUND" };
  if (path === "theme.texture" || path.startsWith("theme.texture."))
    return { kind: "EDIT_PREMIUM_BACKGROUND" };
  if (path === "theme.cards" || path.startsWith("theme.cards."))
    return { kind: "EDIT_ADVANCED_CARD_BUTTON" };
  if (path === "theme.buttons" || path.startsWith("theme.buttons."))
    return { kind: "EDIT_ADVANCED_CARD_BUTTON" };
  if (path === "layout.responsive" || path.startsWith("layout.responsive."))
    return { kind: "EDIT_MANUAL_RESPONSIVE" };
  if (path === "settings.showBranding") return { kind: "REMOVE_CRIPQER_BRANDING" };

  if (path === "profile.avatar" || path.startsWith("profile.avatar."))
    return { kind: "EDIT_AVATAR_BANNER" };
  if (path === "profile.banner" || path.startsWith("profile.banner."))
    return { kind: "EDIT_AVATAR_BANNER" };
  if (path === "profile" || path.startsWith("profile.")) return { kind: "EDIT_CONTENT" };
  if (path === "theme" || path.startsWith("theme.colors.") || path.startsWith("theme.spacing."))
    return { kind: "EDIT_BASIC_STYLE" };
  if (path === "seo" || path.startsWith("seo.")) return { kind: "EDIT_CONTENT" };
  if (path === "settings.slug" || path === "settings.language" || path === "settings.animation")
    return { kind: "EDIT_BASIC_STYLE" };

  return null;
}

export function intentForBlockPath(path: string): MutationIntent | null {
  if (path === "motion" || path.startsWith("motion.")) return { kind: "EDIT_ADVANCED_MOTION" };
  if (path.startsWith("responsive.")) return { kind: "EDIT_MANUAL_RESPONSIVE" };
  if (
    path === "layout.overlap" ||
    path.startsWith("layout.overlap.") ||
    path === "layout.sticky" ||
    path.startsWith("layout.sticky.") ||
    path === "layout.floating" ||
    path.startsWith("layout.floating.") ||
    path === "layout.constraints" ||
    path.startsWith("layout.constraints.") ||
    path === "layout.offset" ||
    path.startsWith("layout.offset.")
  ) {
    return { kind: "EDIT_ADVANCED_LAYOUT" };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Action → mutation intent (guarded dispatch)                        */
/* ------------------------------------------------------------------ */

export function mutationIntentForAction(
  state: Pick<StudioState, "config">,
  action: StudioAction,
): MutationIntent | null {
  switch (action.type) {
    case "addBlock":
      return { kind: "ADD_BLOCK", blockType: action.blockType };
    case "insertBlock":
      return { kind: "ADD_BLOCK", blockType: action.block.type };
    case "insertBlocks": {
      const premium = action.blocks.find(
        (b) => getBlockEntitlement(b.type).classification === "PREMIUM",
      );
      return premium ? { kind: "ADD_BLOCK", blockType: premium.type } : null;
    }
    case "duplicateBlock": {
      const source = state.config.blocks.find((b) => b.id === action.id);
      if (!source) return null;
      return { kind: "DUPLICATE_BLOCK", blockType: source.type };
    }
    case "deleteBlock":
      return { kind: "DELETE_BLOCK" };
    case "moveBlock":
    case "reorderBlock":
      return { kind: "REORDER_BLOCK" };
    case "toggleBlockHidden":
      return { kind: "TOGGLE_BLOCK_VISIBILITY" };
    case "patch":
      return intentForConfigPath(action.path);
    case "patchBlockField":
      return intentForBlockPath(action.path);
    case "updateBlock":
    case "patchConfig":
    case "replaceConfig":
    case "selectBlock":
    case "undo":
    case "redo":
    case "markSaved":
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Hooks                                                              */
/* ------------------------------------------------------------------ */

export function useTier(): ProductTier {
  return useStudio().tier;
}

export function useCapabilityAccess(capability: ProductCapability) {
  const tier = useTier();
  return useMemo(() => resolveCapabilityAccess(tier, capability), [tier, capability]);
}

export function useAssetEntitlement(kind: ProductAssetKind, id: string): AssetEntitlement {
  return useMemo(() => resolveAssetEntitlement(kind, id), [kind, id]);
}

export function useAssetLocked(kind: ProductAssetKind, id: string): boolean {
  const tier = useTier();
  return useMemo(() => isAssetLocked(kind, id, tier), [kind, id, tier]);
}

export function useCanMutate(intent: MutationIntent): boolean {
  const tier = useTier();
  return useMemo(
    () => authorizeCanonicalMutation(tier, intent).decision === "ALLOW",
    [tier, intent],
  );
}

/* ------------------------------------------------------------------ */
/* Lock UI                                                            */
/* ------------------------------------------------------------------ */

export function ProBadge({ label = "Pro" }: { label?: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-foreground"
      title={`Disponible en ${label}`}
      aria-label={`Disponible en ${label}`}
    >
      <Lock className="h-3 w-3" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function Locked({ locked, children }: { locked: boolean; children: ReactNode }) {
  if (!locked) return <>{children}</>;
  return (
    <fieldset
      disabled
      aria-disabled="true"
      className="pointer-events-none m-0 border-0 p-0 opacity-60"
    >
      {children}
    </fieldset>
  );
}

