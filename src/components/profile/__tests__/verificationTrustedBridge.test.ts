import { describe, expect, it } from "vitest";
import { createCanonicalPageEnvelope } from "../../../lib/canonical-page/contract";
import { createDemoConfig } from "../../../premium-template-studio/templates/definitions";
import { resolveVerificationVariant } from "../../../premium-template-studio/components/canvas/ProfileHeader";
import { applyTrustedVerificationVariant } from "../canonicalRenderBridge";
import { resolvePublicProfileCanonicalConfig } from "../PublicProfileView";

describe("trusted verification variant bridge (security)", () => {
  it("db official-gold overrides canonical none → gold", () => {
    const config = createDemoConfig();
    config.profile.verified = false;
    const merged = applyTrustedVerificationVariant(config, "official-gold");
    expect(
      resolveVerificationVariant(merged.profile.verified, merged.profile.verificationVariant),
    ).toBe("official-gold");
  });

  it("canonical official-gold cannot spoof when db is none", () => {
    const config = createDemoConfig();
    config.profile.verified = true;
    config.profile.verificationVariant = "official-gold"; // user-crafted canonical
    const merged = applyTrustedVerificationVariant(config, "none");
    expect(merged.profile.verificationVariant).toBeUndefined(); // stripped
    const resolved = resolveVerificationVariant(
      merged.profile.verified,
      merged.profile.verificationVariant,
    );
    expect(resolved).not.toBe("official-gold");
    expect(resolved).toBe("standard"); // legacy verified=true preserved
  });

  it("db standard → standard", () => {
    const config = createDemoConfig();
    const merged = applyTrustedVerificationVariant(config, "standard");
    expect(merged.profile.verificationVariant).toBe("standard");
  });

  it("returns the same reference when nothing to apply/strip", () => {
    const config = createDemoConfig();
    expect(applyTrustedVerificationVariant(config, "none")).toBe(config);
    expect(applyTrustedVerificationVariant(config, undefined)).toBe(config);
  });
});

describe("trusted variant reaches both render paths", () => {
  it("public path applies trusted DB variant (not published snapshot)", () => {
    const publishedConfig = createDemoConfig();
    publishedConfig.profile.verified = false;
    publishedConfig.profile.verificationVariant = "official-gold"; // spoof in snapshot

    const resolved = resolvePublicProfileCanonicalConfig({
      published_template_config: createCanonicalPageEnvelope(publishedConfig),
      verification_variant: "none", // trusted DB says none
    });

    expect(resolved).not.toBeNull();
    expect(resolved!.profile.verificationVariant).toBeUndefined();
    expect(
      resolveVerificationVariant(resolved!.profile.verified, resolved!.profile.verificationVariant),
    ).not.toBe("official-gold");
  });

  it("public path grants gold when trusted DB says official-gold", () => {
    const publishedConfig = createDemoConfig();
    publishedConfig.profile.verified = false;
    publishedConfig.profile.verificationVariant = "none";

    const resolved = resolvePublicProfileCanonicalConfig({
      published_template_config: createCanonicalPageEnvelope(publishedConfig),
      verification_variant: "official-gold",
    });

    expect(resolved!.profile.verificationVariant).toBe("official-gold");
  });

  it("no publish dependency: verification is not frozen in published_template_config", () => {
    // The published snapshot can claim gold, but the trusted DB value (none)
    // wins — revoking gold in the DB takes effect without republishing.
    const publishedConfig = createDemoConfig();
    publishedConfig.profile.verificationVariant = "official-gold";

    const resolved = resolvePublicProfileCanonicalConfig({
      published_template_config: createCanonicalPageEnvelope(publishedConfig),
      verification_variant: "none",
    });

    expect(resolved!.profile.verificationVariant).toBeUndefined();
  });
});
