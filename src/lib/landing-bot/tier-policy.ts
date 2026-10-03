import type { LandingBotConfig } from "../../isolated/magic-page-editor/types/editor";
import { isLandingBotProTier } from "./config";

/** Fields only Pro may expose. Free requests get these stripped server-side. */
export const LANDING_BOT_PRO_FIELDS = [
  "services",
  "hours",
  "address",
  "faq",
  "stores",
  "avatarUrl",
  "avatarIcon",
] as const;

/**
 * Server-side tier policy. Returns the config a given tier is actually allowed
 * to use:
 *   - Free  → Pro-only fields are dropped (social/prices disabled, generic face).
 *   - Pro+  → unchanged.
 *
 * Pure and total: never throws and never mutates the input.
 */
export function applyLandingBotTierPolicy(config: LandingBotConfig, tier: string): LandingBotConfig {
  if (isLandingBotProTier(tier)) return config;
  return {
    ...config,
    persona: "generic",
    avatarUrl: "",
    avatarIcon: "",
    services: "",
    hours: "",
    address: "",
    faq: "",
    stores: "",
    social: { instagram: "", tiktok: "", youtube: "", facebook: "", website: "" },
    prices: { enabled: false, currency: config.prices.currency, items: [] },
  };
}

/** True when the config carries any Pro-only content (for rejection checks). */
export function hasProOnlyBotContent(config: LandingBotConfig): boolean {
  return (
    config.persona !== "generic" ||
    config.avatarUrl.trim() !== "" ||
    config.avatarIcon.trim() !== "" ||
    config.services.trim() !== "" ||
    config.hours.trim() !== "" ||
    config.address.trim() !== "" ||
    config.faq.trim() !== "" ||
    config.stores.trim() !== "" ||
    Object.values(config.social).some((value) => value.trim() !== "") ||
    config.prices.enabled ||
    config.prices.items.length > 0
  );
}
