import { describe, expect, it } from "vitest";

import { generateCripqerPageWithEngineV2 } from "@/lib/parametric-engine-v2/internal-entrypoint";
import {
  FUTURE_COMMERCE_FIXTURE,
  RICH_SERVICE_FIXTURE,
  SIMPLE_CONTACT_FIXTURE,
  mapOnboardingIntentV2ToEngineInput,
} from "../index";
import { generateFromOnboardingIntentV2 } from "../engine-v2-generation";
import type { OnboardingIntentV2 } from "../types";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function portfolioFixture(): OnboardingIntentV2 {
  return {
    ...clone(SIMPLE_CONTACT_FIXTURE),
    identity: {
      ...SIMPLE_CONTACT_FIXTURE.identity,
      displayName: "Estudio Frame",
      professionOrActivity: "Fotógrafo",
    },
    outcome: { primaryGoal: "show_portfolio" },
    contentNeeds: {
      items: [
        { type: "portfolio" },
        { type: "gallery" },
        { type: "video" },
        { type: "social_networks" },
      ],
    },
    actions: {
      primary: { type: "website", source: "user", value: "https://frame.example/portfolio" },
      secondary: [{ type: "follow", source: "user", value: "https://instagram.com/frame" }],
    },
    media: { preference: "own_media", hasOwnPhotos: true, hasVideos: true },
    scope: { density: "complete", userSelected: true },
  };
}

describe("Onboarding V2 -> Engine V2 adapter", () => {
  it("maps the simple contact contract to the exact host vocabulary", () => {
    const intent = clone(SIMPLE_CONTACT_FIXTURE);
    intent.identity.professionOrActivity = "local";
    const mapped = mapOnboardingIntentV2ToEngineInput(intent);
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.engineInput.profession).toBe("local");
    expect(mapped.engineInput.goal).toBe("whatsapp");
    expect(mapped.engineInput.primaryAction).toEqual({ type: "whatsapp", value: "+56912345678" });
    expect(mapped.engineInput.selectedFeatures).toEqual(["links", "social"]);
    expect(mapped.engineInput.content?.links).toBeUndefined();
    expect(mapped.engineInput.businessOther).toBeUndefined();
  });

  it.each(["Jardinero", "Veterinaria", "Fotógrafo"])(
    "preserves the free-form activity %s through the host custom field",
    (profession) => {
      const intent = clone(SIMPLE_CONTACT_FIXTURE);
      intent.identity.professionOrActivity = profession;
      const mapped = mapOnboardingIntentV2ToEngineInput(intent);
      expect(mapped.ok).toBe(true);
      if (!mapped.ok) return;
      expect(mapped.engineInput.profession).toBe(profession);
      expect(mapped.engineInput.businessOther).toBe(profession);
      expect(mapped.engineInput.profession).not.toBe("other");
      expect(mapped.diagnostics.mappedFields).toContain(
        "identity.professionOrActivity -> businessOther",
      );
    },
  );

  it("maps rich service semantics and records unsupported host fields", () => {
    const intent = clone(RICH_SERVICE_FIXTURE);
    intent.identity.professionOrActivity = "professional";
    const mapped = mapOnboardingIntentV2ToEngineInput(intent);
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.engineInput.goal).toBe("booking");
    expect(mapped.engineInput.primaryAction).toEqual({
      type: "booking",
      value: "https://agenda.vetvida.example/reservas",
    });
    expect(mapped.engineInput.selectedFeatures).toEqual([
      "services",
      "team",
      "gallery",
      "testimonials",
      "booking",
    ]);
    expect(mapped.diagnostics.deferredFields).toEqual(
      expect.arrayContaining(["contentNeeds.team", "contentNeeds.testimonials"]),
    );
  });

  it("preserves secondary URL actions as ordered content links and reports priority loss", () => {
    const intent = clone(SIMPLE_CONTACT_FIXTURE);
    intent.identity.professionOrActivity = "local";
    intent.actions.secondary = [
      { type: "website", source: "user", value: "https://example.com/one", label: "Uno" },
      { type: "website", source: "user", value: "https://example.com/two", label: "Dos" },
    ];
    const mapped = mapOnboardingIntentV2ToEngineInput(intent);
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.engineInput.content?.links).toEqual([
      { label: "Uno", url: "https://example.com/one" },
      { label: "Dos", url: "https://example.com/two" },
    ]);
    expect(mapped.diagnostics.deferredFields).toContain("actions.secondary.priority");
  });

  it("does not fabricate a URL for a secondary phone or handle", () => {
    const intent = clone(SIMPLE_CONTACT_FIXTURE);
    intent.identity.professionOrActivity = "local";
    const mapped = mapOnboardingIntentV2ToEngineInput(intent);
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.engineInput.content?.links).toBeUndefined();
    expect(JSON.stringify(mapped.engineInput)).not.toContain("wa.me");
  });

  it("maps style, media refs and density without mutating the source", () => {
    const intent = clone(RICH_SERVICE_FIXTURE);
    intent.identity.professionOrActivity = "professional";
    intent.visualDirection = { preference: "premium" };
    intent.identity.avatarAssetRef = "https://cdn.example/avatar.png";
    intent.identity.bannerAssetRef = "https://cdn.example/banner.png";
    intent.scope = { density: "complete", userSelected: true };
    const before = JSON.stringify(intent);
    const mapped = mapOnboardingIntentV2ToEngineInput(intent);
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.engineInput.style).toBe("premium");
    expect(mapped.engineInput.userMedia).toEqual({
      avatarUrl: "https://cdn.example/avatar.png",
      bannerUrl: "https://cdn.example/banner.png",
    });
    expect(JSON.stringify(intent)).toBe(before);
    expect(mapped.diagnostics.deferredFields).toContain("scope.density=complete");
  });

  it("defers the future commerce signal and rejects the unsupported buy primary action", () => {
    const mapped = mapOnboardingIntentV2ToEngineInput(FUTURE_COMMERCE_FIXTURE);
    expect(mapped).toMatchObject({ ok: false, code: "UNSUPPORTED_SEMANTICS" });
    if (mapped.ok) return;
    expect(mapped.diagnostics.unsupportedFields).toContain("actions.primary");
    expect(mapped.diagnostics.warnings.join(" ")).toContain("Commercial intent");
    expect(mapped.errors.join(" ")).toContain("Engine V2");
  });

  it("requires an explicit primary CTA when the current host has no destination fallback", () => {
    const intent = clone(SIMPLE_CONTACT_FIXTURE);
    intent.actions = { secondary: intent.actions.secondary };
    const result = generateFromOnboardingIntentV2(intent, { now: "2026-09-04T12:00:00.000Z" });
    expect(result.status).toBe("NEEDS_INPUT");
  });

  it("rejects a malformed required destination before Engine V2 is called", () => {
    const intent = clone(SIMPLE_CONTACT_FIXTURE);
    intent.actions.primary = { type: "website", source: "user", value: "https://a.b" };
    const result = generateFromOnboardingIntentV2(intent);
    expect(result.status).toBe("INVALID_DESTINATION");
  });

  it("keeps recognized activities unchanged and does not add a custom value", () => {
    const intent = clone(RICH_SERVICE_FIXTURE);
    intent.identity.professionOrActivity = "professional";
    const mapped = mapOnboardingIntentV2ToEngineInput(intent);
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.engineInput.profession).toBe("professional");
    expect(mapped.engineInput.businessOther).toBeUndefined();
  });

  it("rejects an empty custom value at the host validation boundary", () => {
    const intent = clone(SIMPLE_CONTACT_FIXTURE);
    intent.identity.professionOrActivity = "Jardinero";
    const mapped = mapOnboardingIntentV2ToEngineInput(intent);
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    const invalidHostInput = { ...mapped.engineInput, businessOther: " " };
    try {
      generateCripqerPageWithEngineV2(invalidHostInput);
      throw new Error("Expected Engine V2 to reject an empty custom activity.");
    } catch (error) {
      expect(error).toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: "business_other", code: "required" }),
        ]),
      });
    }
  });

  it("generates and validates simple, rich and portfolio configs in memory", () => {
    const simple = generateFromOnboardingIntentV2(SIMPLE_CONTACT_FIXTURE, {
      now: "2026-09-04T12:00:00.000Z",
    });
    const rich = generateFromOnboardingIntentV2(RICH_SERVICE_FIXTURE, {
      now: "2026-09-04T12:00:00.000Z",
    });
    const portfolio = generateFromOnboardingIntentV2(portfolioFixture(), {
      now: "2026-09-04T12:00:00.000Z",
    });
    expect(simple.status).toBe("GENERATED");
    expect(rich.status).toBe("GENERATED");
    expect(portfolio.status).toBe("GENERATED");
    for (const result of [simple, rich, portfolio]) {
      if (result.status !== "GENERATED") return;
      expect(result.canonicalEnvelopePreview.schemaVersion).toBe(1);
      expect(result.editorConfig.blocks.length).toBeGreaterThan(0);
    }
  });

  it("exercises the wrapper happy path when the frozen host taxonomy can represent the activity", () => {
    const intent = clone(RICH_SERVICE_FIXTURE);
    intent.identity.professionOrActivity = "professional";
    const result = generateFromOnboardingIntentV2(intent, {
      now: "2026-09-04T12:00:00.000Z",
    });
    expect(result.status).toBe("GENERATED");
    if (result.status !== "GENERATED") return;
    expect(result.canonicalEnvelopePreview.schemaVersion).toBe(1);
    expect(result.editorConfig.blocks.length).toBeGreaterThan(0);
    expect(result.engineInput.goal).toBe("booking");
  });
});
