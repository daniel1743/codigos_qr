import type { ElementContract } from "../types";

export type ElementVisibilityResult =
  | { allowed: true; contract: ElementContract }
  | { allowed: false; reason: "not-optional" | "protected" };

export function isElementVisible(contract?: ElementContract): boolean {
  return contract?.visible !== false;
}

export function resolveElementContract(
  contract: ElementContract | undefined,
  fallbackOptional = false,
): ElementContract {
  return {
    optional: contract?.optional ?? fallbackOptional,
    visible: contract?.visible ?? true,
    protected: contract?.protected ?? false,
  };
}

export function setElementVisibility(
  contract: ElementContract | undefined,
  visible: boolean,
  fallbackOptional = false,
): ElementVisibilityResult {
  const current = resolveElementContract(contract, fallbackOptional);
  if (current.protected) return { allowed: false, reason: "protected" };
  if (!current.optional) return { allowed: false, reason: "not-optional" };
  return { allowed: true, contract: { ...current, visible } };
}
