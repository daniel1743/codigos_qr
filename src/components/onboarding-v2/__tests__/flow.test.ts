import { describe, expect, it } from "vitest";

import {
  buildOnboardingIntentV2,
  createEmptyOnboardingV2Draft,
  fromPersistedDraftV2,
  isCommercialRelevant,
  reconcileOnboardingV2Draft,
  toPersistedDraftV2,
  type OnboardingV2Draft,
} from "../state";

const completeDraft = (): OnboardingV2Draft => ({
  ...createEmptyOnboardingV2Draft(),
  identity: {
    displayName: "Jardinería Verde",
    professionOrActivity: "Jardinero",
    bio: "Cuido jardines.",
    avatarPreview: "blob:http://localhost/preview",
  },
  business: { category: "local", customCategory: "" },
  outcome: { primaryGoal: "whatsapp", customGoal: "" },
  visualDirection: { preference: "let_cripqer_decide", customDescription: "" },
  contentNeeds: {
    items: [{ type: "links" }, { type: "social_networks" }],
    userHasNoContentYet: false,
  },
  actions: {
    primary: { type: "whatsapp", source: "user", value: "+56912345678" },
    secondary: [{ type: "follow", source: "user", value: "@jardineriaverde" }],
  },
  media: { preference: "minimal_media", hasOwnPhotos: false },
  scope: { density: "simple", userSelected: true },
  commercial: { mode: null, relevant: false },
});

describe("Onboarding V2 hybrid flow state", () => {
  it("emits a valid simple contact intent", () => {
    const result = buildOnboardingIntentV2(completeDraft(), "2026-09-04T12:00:00.000Z");
    expect(result.validation.valid).toBe(true);
    expect(result.intent?.version).toBe("2");
    expect(result.intent?.actions.secondary).toHaveLength(1);
    expect(result.intent?.identity).not.toHaveProperty("avatarPreview");
  });

  it("keeps rich service needs and action priority", () => {
    const draft = completeDraft();
    draft.identity.displayName = "Clínica Vet Vida";
    draft.identity.professionOrActivity = "Veterinaria";
    draft.outcome.primaryGoal = "bookings";
    draft.contentNeeds.items = [
      { type: "services" },
      { type: "team" },
      { type: "gallery" },
      { type: "testimonials" },
      { type: "booking" },
    ];
    draft.actions.primary = { type: "book", source: "user" };
    draft.actions.secondary = [{ type: "whatsapp", source: "user", value: "+56987654321" }];
    draft.media = {
      preference: "own_media",
      hasOwnPhotos: true,
      hasPortfolioOrGalleryAssets: true,
    };
    draft.scope = { density: "complete", userSelected: true };
    const result = buildOnboardingIntentV2(draft);
    expect(result.validation.valid).toBe(true);
    expect(result.intent?.contentNeeds.items.map((item) => item.type)).toEqual([
      "services",
      "team",
      "gallery",
      "testimonials",
      "booking",
    ]);
    expect(result.intent?.actions.primary?.type).toBe("book");
    expect(result.intent?.actions.primary?.value).toBeUndefined();
  });

  it("records only a high-level commercial signal", () => {
    const draft = completeDraft();
    draft.outcome.primaryGoal = "sell";
    draft.contentNeeds.items = [{ type: "products" }];
    draft.commercial = { mode: "hybrid", relevant: true };
    const result = buildOnboardingIntentV2(draft);
    expect(isCommercialRelevant(draft)).toBe(true);
    expect(result.intent?.commercial).toEqual({ mode: "hybrid", relevant: true });
    expect(result.intent).not.toHaveProperty("catalog");
    expect(result.intent).not.toHaveProperty("products");
  });

  it("allows an explicit no-primary-CTA path", () => {
    const draft = completeDraft();
    draft.outcome.primaryGoal = "presence";
    draft.actions = { primary: null, secondary: [] };
    const result = buildOnboardingIntentV2(draft);
    expect(result.validation.valid).toBe(true);
    expect(result.intent?.actions.primary).toBeUndefined();
  });

  it("clears a stale commercial answer when the conditional branch disappears", () => {
    const draft = completeDraft();
    draft.outcome.primaryGoal = "sell";
    draft.commercial = { mode: "sell", relevant: true };
    draft.outcome.primaryGoal = "presence";
    const reconciled = reconcileOnboardingV2Draft(draft);
    expect(reconciled.commercial).toEqual({ mode: null, relevant: false });
    expect(reconciled.actions.secondary).toHaveLength(1);
  });

  it("restores a session draft without restoring a local avatar blob", () => {
    const persisted = toPersistedDraftV2(completeDraft());
    expect(persisted.identity).not.toHaveProperty("avatarPreview");
    const restored = fromPersistedDraftV2(persisted);
    expect(restored.identity.displayName).toBe("Jardinería Verde");
    expect(restored.identity.avatarPreview).toBeNull();
    expect(restored.actions.secondary).toHaveLength(1);
  });
});
