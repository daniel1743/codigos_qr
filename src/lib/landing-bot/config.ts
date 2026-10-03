import type { LandingBotConfig } from "../../isolated/magic-page-editor/types/editor";

/** Free tier: how many bot messages a landing may consume per day. */
export const LANDING_BOT_FREE_DAILY_LIMIT = 40;

/** Effective tiers that unlock the "Pro" bot fields. */
export const LANDING_BOT_PRO_TIERS = ["pro", "business", "enterprise"] as const;

export function isLandingBotProTier(tier: string | null | undefined): boolean {
  return !!tier && (LANDING_BOT_PRO_TIERS as readonly string[]).includes(tier);
}

/** Canonical default config used both by the editor and the public renderer. */
export function createDefaultLandingBot(): LandingBotConfig {
  return {
    enabled: false,
    persona: "generic",
    avatarUrl: "",
    avatarIcon: "",
    name: "Asistente",
    about: "",
    tone: "cercano",
    whatsapp: "",
    whatsappEnabled: false,
    services: "",
    hours: "",
    address: "",
    faq: "",
    social: { instagram: "", tiktok: "", youtube: "", facebook: "", website: "" },
    stores: "",
    prices: { enabled: false, currency: "CLP", items: [] },
  };
}

/** Normalizes any partial/legacy value into a complete config. */
export function normalizeLandingBot(config: Partial<LandingBotConfig> | undefined | null): LandingBotConfig {
  const base = createDefaultLandingBot();
  if (!config) return base;
  return {
    ...base,
    ...config,
    social: { ...base.social, ...(config.social ?? {}) },
    prices: { ...base.prices, ...(config.prices ?? {}) },
  };
}

/** Digits-only WhatsApp number → wa.me link (null when empty). */
export function landingBotWhatsAppLink(number: string, message = ""): string | null {
  const digits = number.replace(/[^\d]/g, "");
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
