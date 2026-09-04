import { describe, expect, it } from "vitest";
import {
  FUTURE_COMMERCE_FIXTURE,
  NO_PRIMARY_CTA_FIXTURE,
  RICH_SERVICE_FIXTURE,
  SIMPLE_CONTACT_FIXTURE,
  validateOnboardingIntentV2,
} from "../index";

describe("OnboardingIntentV2 contract fixtures", () => {
  it.each([
    ["simple contact", SIMPLE_CONTACT_FIXTURE],
    ["rich service", RICH_SERVICE_FIXTURE],
    ["future commerce", FUTURE_COMMERCE_FIXTURE],
    ["no primary CTA", NO_PRIMARY_CTA_FIXTURE],
  ])("accepts the %s fixture", (_name, fixture) => {
    expect(validateOnboardingIntentV2(fixture)).toEqual({ valid: true, issues: [] });
  });

  it("keeps future commerce semantic and catalog-free", () => {
    expect(FUTURE_COMMERCE_FIXTURE.commercial).toEqual({ mode: "hybrid", relevant: true });
    expect(FUTURE_COMMERCE_FIXTURE.contentNeeds.items).not.toContainEqual(
      expect.objectContaining({ type: "products" }),
    );
    expect(FUTURE_COMMERCE_FIXTURE).not.toHaveProperty("catalog");
    expect(FUTURE_COMMERCE_FIXTURE).not.toHaveProperty("checkout");
    expect(FUTURE_COMMERCE_FIXTURE).not.toHaveProperty("inventory");
  });

  it("preserves secondary action order", () => {
    expect(RICH_SERVICE_FIXTURE.actions.secondary.map((action) => action.type)).toEqual([
      "whatsapp",
    ]);
  });
});
