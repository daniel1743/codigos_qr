import { describe, expect, it } from "vitest";
import { MIGRATED_V1_SOURCE, adaptOnboardingV1ToV2, validateOnboardingIntentV2 } from "../index";

describe("V1 to V2 adapter", () => {
  it("maps the representative V1 payload and reports unavailable domains", () => {
    const result = adaptOnboardingV1ToV2(MIGRATED_V1_SOURCE);
    expect(result.intent).toMatchObject({
      version: "2",
      identity: {
        displayName: "Consulta Aurora",
        professionOrActivity: "Nutricionista",
        bio: "Orientación nutricional personalizada.",
      },
      business: { category: "professional" },
      outcome: { primaryGoal: "bookings" },
      visualDirection: { preference: "professional" },
      actions: {
        primary: { type: "book", source: "user", value: "https://consulta-aurora.example/agenda" },
        secondary: [],
      },
      media: { preference: "no_preference" },
      scope: { density: "auto", userSelected: false },
    });
    expect(result.lossReport.missingDomains).toEqual(
      expect.arrayContaining(["contentNeeds", "media", "scope", "commercial", "secondaryActions"]),
    );
    expect(validateOnboardingIntentV2(result.intent).valid).toBe(true);
  });

  it("is deterministic and does not mutate V1", () => {
    const before = JSON.stringify(MIGRATED_V1_SOURCE);
    const first = adaptOnboardingV1ToV2(MIGRATED_V1_SOURCE);
    const second = adaptOnboardingV1ToV2(MIGRATED_V1_SOURCE);
    expect(second).toEqual(first);
    expect(JSON.stringify(MIGRATED_V1_SOURCE)).toBe(before);
  });

  it("preserves an unknown V1 business value as an explicit custom category warning", () => {
    const source = {
      ...MIGRATED_V1_SOURCE,
      business_type: "apicultura",
      business_other: null,
    };
    const result = adaptOnboardingV1ToV2(source);
    expect(result.intent.business).toEqual({ category: "other", customCategory: "apicultura" });
    expect(result.lossReport.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("preserved as a custom category")]),
    );
  });
});
