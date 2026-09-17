import { describe, expect, it } from "vitest";

import { buildOnboardingIntentV2 } from "@/components/onboarding-v2/state";
import { RICH_SERVICE_FIXTURE, SIMPLE_CONTACT_FIXTURE, validateOnboardingIntentV2 } from "../index";
import type { OnboardingIntentV2 } from "../types";

describe("Onboarding V2 shared owner-content contract", () => {
  it("keeps old payloads valid and ownerContent optional", () => {
    expect(validateOnboardingIntentV2(SIMPLE_CONTACT_FIXTURE)).toEqual({ valid: true, issues: [] });
    expect(SIMPLE_CONTACT_FIXTURE).not.toHaveProperty("ownerContent");
  });

  it("accepts partial owner content without making it a global onboarding requirement", () => {
    const intent: OnboardingIntentV2 = {
      ...RICH_SERVICE_FIXTURE,
      ownerContent: { services: [{ name: "Consulta inicial" }] },
    };
    expect(validateOnboardingIntentV2(intent)).toEqual({ valid: true, issues: [] });
  });

  it("rejects malformed owner content with a stable ownerContent path", () => {
    const intent = {
      ...SIMPLE_CONTACT_FIXTURE,
      ownerContent: {
        products: [{ name: "", media: [{ url: "data:image/png;base64,x", kind: "image" }] }],
      },
    } as unknown as Record<string, unknown>;
    const result = validateOnboardingIntentV2(intent);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "ownerContent.products[0].name" }),
        expect.objectContaining({ path: "ownerContent.products[0].media[0].url" }),
      ]),
    );
  });

  it("allows a host caller to add owner content without changing the onboarding UI draft", () => {
    const draft = {
      identity: {
        displayName: "Ana",
        professionOrActivity: "Fotógrafa",
        bio: "",
        avatarPreview: null,
      },
      business: { category: "creator" as const, customCategory: "" },
      outcome: { primaryGoal: "show_portfolio" as const, customGoal: "" },
      visualDirection: { preference: "professional" as const, customDescription: "" },
      contentNeeds: { items: [{ type: "portfolio" as const }], userHasNoContentYet: false },
      actions: { primary: null, secondary: [] },
      media: { preference: "own_media" as const, hasOwnPhotos: true },
      scope: { density: "complete" as const, userSelected: true },
      commercial: { mode: null, relevant: false },
    };
    const result = buildOnboardingIntentV2(draft, "2026-09-15T12:00:00.000Z", {
      portfolioItems: [
        { name: "Boda", media: [{ url: "https://cdn.example.com/boda.jpg", kind: "image" }] },
      ],
    });
    expect(result.intent?.ownerContent?.portfolioItems?.[0]?.name).toBe("Boda");
    expect(result.validation.valid).toBe(true);
  });
});
