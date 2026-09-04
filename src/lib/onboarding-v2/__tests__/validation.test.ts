import { describe, expect, it } from "vitest";
import {
  FUTURE_COMMERCE_FIXTURE,
  NO_PRIMARY_CTA_FIXTURE,
  SIMPLE_CONTACT_FIXTURE,
  validateOnboardingIntentV2,
} from "../index";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe("OnboardingIntentV2 validation", () => {
  it("rejects an invalid version", () => {
    const value = clone(SIMPLE_CONTACT_FIXTURE) as unknown as Record<string, unknown>;
    value["version"] = "1";
    expect(validateOnboardingIntentV2(value).issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "version", code: "invalid_enum" })]),
    );
  });

  it("rejects missing required identity", () => {
    const value = clone(SIMPLE_CONTACT_FIXTURE) as unknown as Record<string, unknown>;
    delete value["identity"];
    expect(validateOnboardingIntentV2(value).issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "identity", code: "required" })]),
    );
  });

  it("rejects invalid semantic enums", () => {
    const value = clone(SIMPLE_CONTACT_FIXTURE) as unknown as Record<string, unknown>;
    (value["outcome"] as Record<string, unknown>)["primaryGoal"] = "make_magic";
    expect(validateOnboardingIntentV2(value).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "outcome.primaryGoal", code: "invalid_enum" }),
      ]),
    );
  });

  it("rejects malformed user action destinations", () => {
    const value = clone(SIMPLE_CONTACT_FIXTURE) as unknown as Record<string, unknown>;
    const actions = value["actions"] as Record<string, unknown>;
    const primary = actions["primary"] as Record<string, unknown>;
    primary["value"] = "not-a-phone";
    expect(validateOnboardingIntentV2(value).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "actions.primary.value", code: "invalid_format" }),
      ]),
    );
  });

  it("rejects blob asset references", () => {
    const value = clone(SIMPLE_CONTACT_FIXTURE) as unknown as Record<string, unknown>;
    (value["identity"] as Record<string, unknown>)["avatarAssetRef"] = "blob:http://localhost/test";
    expect(validateOnboardingIntentV2(value).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "identity.avatarAssetRef", code: "invalid_asset_ref" }),
      ]),
    );
  });

  it("accepts hybrid commercial intent without commerce payload", () => {
    expect(validateOnboardingIntentV2(FUTURE_COMMERCE_FIXTURE).valid).toBe(true);
  });

  it("accepts an explicit no-primary-CTA semantic intent without inventing a destination", () => {
    const result = validateOnboardingIntentV2(NO_PRIMARY_CTA_FIXTURE);
    expect(result.valid).toBe(true);
    expect(NO_PRIMARY_CTA_FIXTURE.actions.primary).toBeUndefined();
  });
});
