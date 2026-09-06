import { describe, expect, it } from "vitest";
import { createCanonicalPageEnvelope } from "@/lib/canonical-page";
import { createDemoConfig } from "@/premium-template-studio/templates/definitions";
import { buildPowerEditorHandoffUrl, resolveEditorDestination } from "../resolveEditorDestination";

describe("editor destination resolution", () => {
  it("routes a valid canonical page to Power Editor", () => {
    expect(resolveEditorDestination(createCanonicalPageEnvelope(createDemoConfig()))).toBe("power");
  });

  it("keeps legacy and invalid canonical values in Basic Editor", () => {
    expect(resolveEditorDestination(undefined)).toBe("basic");
    expect(resolveEditorDestination({ schemaVersion: 1, editorConfig: { blocks: [] } })).toBe(
      "basic",
    );
    expect(resolveEditorDestination({ template_id: "basic-modern-01" })).toBe("basic");
  });

  it("builds a same-profile Power Editor handoff URL", () => {
    expect(buildPowerEditorHandoffUrl("profile/with spaces")).toBe(
      "/power-editor?profileId=profile%2Fwith%20spaces",
    );
  });
});
