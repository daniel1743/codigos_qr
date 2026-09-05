import { describe, expect, it } from "vitest";

import { isOnboardingV2Enabled, requireOnboardingV2Enabled } from "../env";

describe("isOnboardingV2Enabled", () => {
  it("is disabled unless the internal flag is exactly true", () => {
    expect(isOnboardingV2Enabled({})).toBe(false);
    expect(isOnboardingV2Enabled({ VITE_ENABLE_ONBOARDING_V2: "false" })).toBe(false);
    expect(isOnboardingV2Enabled({ VITE_ENABLE_ONBOARDING_V2: "TRUE" })).toBe(false);
    expect(isOnboardingV2Enabled({ VITE_ENABLE_ONBOARDING_V2: "true" })).toBe(true);
  });

  it("rejects server work while the flag is off", () => {
    expect(() => requireOnboardingV2Enabled()).toThrow("Onboarding V2 is disabled.");
  });
});
