import { describe, expect, it } from "vitest";

import { computePowerMediaCardPatch } from "../components/inspector/Inspector";
import type { SmartLinkPreview } from "../../../lib/smart-link-preview";

/**
 * Power Editor Media Card smart-link bridge — enrichment contract tests.
 *
 * Reuses the existing `smart-link-preview` resolver/enrichment (no new resolver).
 * `computePowerMediaCardPatch` maps a resolved preview onto a media-card item's
 * `label` (title), `description` and `imageUrl`, filling only empty/default
 * fields and never overwriting user-authored content.
 */

describe("Power Media Card smart-link bridge", () => {
  it("Instagram fallback → usable card, no broken image, label filled with @handle", () => {
    const preview: SmartLinkPreview = {
      url: "https://instagram.com/daniel",
      provider: "instagram",
      handle: "daniel",
      status: "fallback",
    };
    const patch = computePowerMediaCardPatch(
      { label: "", description: undefined, imageUrl: undefined },
      preview,
    );
    expect(patch.label).toBe("@daniel");
    // Fallback never fabricates an image → no broken <img>.
    expect(patch.imageUrl).toBeUndefined();
  });

  it("YouTube enrichment → title and imageUrl populated when empty", () => {
    const preview: SmartLinkPreview = {
      url: "https://youtube.com/watch?v=abc",
      provider: "youtube",
      title: "Example video",
      imageUrl: "https://example.test/thumb.jpg",
      status: "full",
    };
    const patch = computePowerMediaCardPatch(
      { label: "", description: "", imageUrl: "" },
      preview,
    );
    expect(patch.label).toBe("Example video");
    expect(patch.imageUrl).toBe("https://example.test/thumb.jpg");
  });

  it("preserves custom title / description / image", () => {
    const preview: SmartLinkPreview = {
      url: "https://example.com",
      provider: "generic-web",
      title: "External title",
      description: "External description",
      imageUrl: "https://external.test/image.jpg",
      status: "full",
    };
    const patch = computePowerMediaCardPatch(
      {
        label: "Mi título",
        description: "Mi descripción",
        imageUrl: "https://my-image.test/custom.jpg",
      },
      preview,
    );
    expect(patch.label).toBeUndefined();
    expect(patch.description).toBeUndefined();
    expect(patch.imageUrl).toBeUndefined();
  });

  it("treats the default 'New item' label as fillable", () => {
    const preview: SmartLinkPreview = {
      url: "https://instagram.com/daniel",
      provider: "instagram",
      handle: "daniel",
      status: "fallback",
    };
    const patch = computePowerMediaCardPatch(
      { label: "New item", description: undefined, imageUrl: undefined },
      preview,
    );
    expect(patch.label).toBe("@daniel");
  });

  it("generic web with only a title fills label but not image", () => {
    const preview: SmartLinkPreview = {
      url: "https://example.com",
      provider: "generic-web",
      title: "Example site",
      status: "partial",
    };
    const patch = computePowerMediaCardPatch(
      { label: "", description: "", imageUrl: "" },
      preview,
    );
    expect(patch.label).toBe("Example site");
    expect(patch.imageUrl).toBeUndefined();
  });
});
