import { describe, expect, it } from "vitest";
import { createDefaultLandingBot } from "../config";
import { applyLandingBotTierPolicy, hasProOnlyBotContent } from "../tier-policy";
import type { LandingBotConfig } from "../../../isolated/magic-page-editor/types/editor";

function proConfig(): LandingBotConfig {
  const base = createDefaultLandingBot();
  return {
    ...base,
    enabled: true,
    persona: "custom",
    avatarUrl: "https://cdn.example.com/face.png",
    avatarIcon: "sparkles",
    services: "Consultas nutricionales",
    hours: "Lun-Vie 9-18",
    address: "Santiago",
    faq: "¿Atienden online?",
    stores: "Tienda Providencia",
    social: { ...base.social, instagram: "@ana" },
    prices: { enabled: true, currency: "CLP", items: [{ name: "Plan", price: "10.000" }] },
  };
}

describe("landing bot tier policy", () => {
  it("free strips every Pro-only field", () => {
    const result = applyLandingBotTierPolicy(proConfig(), "free");
    expect(result.persona).toBe("generic");
    expect(result.avatarUrl).toBe("");
    expect(result.avatarIcon).toBe("");
    expect(result.services).toBe("");
    expect(result.hours).toBe("");
    expect(result.address).toBe("");
    expect(result.faq).toBe("");
    expect(result.stores).toBe("");
    expect(result.social.instagram).toBe("");
    expect(result.prices.enabled).toBe(false);
    expect(result.prices.items).toHaveLength(0);
    expect(hasProOnlyBotContent(result)).toBe(false);
  });

  it("free keeps the allowed free fields", () => {
    const cfg: LandingBotConfig = {
      ...proConfig(),
      name: "Ana",
      about: "Nutricionista",
      tone: "formal",
      whatsapp: "56911111111",
      whatsappEnabled: true,
    };
    const result = applyLandingBotTierPolicy(cfg, "free");
    expect(result.enabled).toBe(true);
    expect(result.name).toBe("Ana");
    expect(result.about).toBe("Nutricionista");
    expect(result.tone).toBe("formal");
    expect(result.whatsapp).toBe("56911111111");
    expect(result.whatsappEnabled).toBe(true);
  });

  it("pro keeps Pro content untouched", () => {
    const cfg = proConfig();
    const result = applyLandingBotTierPolicy(cfg, "pro");
    expect(result).toEqual(cfg);
    expect(hasProOnlyBotContent(result)).toBe(true);
  });

  it("never mutates the input", () => {
    const cfg = proConfig();
    applyLandingBotTierPolicy(cfg, "free");
    expect(cfg.services).toBe("Consultas nutricionales");
    expect(cfg.prices.enabled).toBe(true);
  });

  it("hasProOnlyBotContent is false for a pristine default config", () => {
    expect(hasProOnlyBotContent(createDefaultLandingBot())).toBe(false);
  });
});
