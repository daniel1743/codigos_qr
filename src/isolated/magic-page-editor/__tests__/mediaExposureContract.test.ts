import { describe, expect, it } from "vitest";
import { heroVariants } from "../components/editor/controls/HeroVariantPicker";
import { heroFusionOptions } from "../components/editor/controls/HeroFusionPicker";
import {
  mediaOverlayOptions,
  mediaZoomOptions,
} from "../components/editor/controls/MediaTreatmentPicker";
import {
  heroFusionFromProps,
  heroFusionOverlayStyleFromProps,
  heroFusionStyleFromProps,
  mediaOverlayFromProps,
  mediaOverlayStyleFromProps,
  mediaPhotoStyle,
  mediaTreatmentFromProps,
} from "../utils/styles";

const ACCENT = "#e11d48";

describe("canonical editor exposure: hero variants + fusion", () => {
  it("keeps every hero layout variant wired to the picker", () => {
    expect(heroVariants.map((v) => v.value)).toEqual([
      // L2.1 appends here. This list is the contract: a new composition has to
      // be named in it, which is what makes widening the set a deliberate act.
      "simple",
      "centered",
      "split",
      "image",
      "arch",
      "floating",
      "banner",
      "mosaic",
      "frame",
      "bleed",
      "editorialCenter",
      "splitHorizontal",
      "splitVertical",
      "fullBleed",
      "photoCard",
      "avatarBand",
      "photoGrid",
      "quote",
      "collage",
      "lowerBlock",
      "galleryFrame",
      "sideBleed",
      "magazine",
      "elegantOverlay",
      "backgroundFade",
      "minimalPremium",
      "sideInfo",
      "descriptionCard",
      "cinematic",
      "brandIdentity",
      "cinematicTall",
      "photoBand",
      "imageThenText",
      "centeredStack",
      "identityBand",
      "overlayBottom",
      "masthead",
      "minimalColumn",
      "gridCollage",
      "avatarOverlap",
      "framedPlate",
    ]);
    // Derived, not a magic number: adding a composition means adding it to the
    // list above, never editing a count.
    expect(new Set(heroVariants.map((v) => v.value)).size).toBe(heroVariants.length);
  });

  it("exposes every implemented fusion mode (L0) as a discoverable option", () => {
    expect(heroFusionOptions.map((o) => o.value)).toEqual([
      "none",
      "fade",
      "halo",
      "organic",
      "dominant",
    ]);
  });

  it("reads the fusion prop from the document and falls back to none", () => {
    expect(heroFusionFromProps({ fusion: "dominant" })).toBe("dominant");
    expect(heroFusionFromProps({ fusion: "fade" })).toBe("fade");
    expect(heroFusionFromProps({ fusion: "unknown" })).toBe("none");
    expect(heroFusionFromProps(undefined)).toBe("none");
  });

  it("renders the fusion treatment through the shared engine", () => {
    expect(heroFusionStyleFromProps({ fusion: "none" }, ACCENT)).toEqual({});
    expect(heroFusionStyleFromProps({ fusion: "halo" }, ACCENT)).toMatchObject({
      boxShadow: expect.stringContaining(ACCENT) as unknown as string,
    });
    expect(heroFusionStyleFromProps({ fusion: "organic" }, ACCENT)).toMatchObject({
      borderRadius: "32px 18px 32px 18px",
    });
    expect(heroFusionStyleFromProps({ fusion: "dominant" }, ACCENT)).toMatchObject({
      boxShadow: expect.stringContaining(ACCENT) as unknown as string,
    });
    // "fade" is an overlay node, not a container treatment.
    expect(heroFusionStyleFromProps({ fusion: "fade" }, ACCENT)).toEqual({});
    expect(heroFusionOverlayStyleFromProps({ fusion: "fade" }, ACCENT)).toMatchObject({
      background: expect.stringContaining(ACCENT) as unknown as string,
    });
    expect(heroFusionOverlayStyleFromProps({ fusion: "halo" }, ACCENT)).toBeUndefined();
  });
});

describe("canonical editor exposure: media treatment (L3) on hero, avatar and cards", () => {
  it("parses the string prop bag into the canonical treatment", () => {
    expect(
      mediaTreatmentFromProps({ zoom: "1.5", overlay: "medium", overlayColor: "#123456" }),
    ).toEqual({
      cropX: 50,
      cropY: 50,
      zoom: 1.5,
      overlay: "medium",
      overlayColor: "#123456",
    });
    expect(mediaTreatmentFromProps({})).toEqual({
      cropX: 50,
      cropY: 50,
      zoom: 1,
      overlay: "none",
      overlayColor: "#111318",
    });
    expect(mediaTreatmentFromProps({ zoom: "nope", overlay: "gone" })).toMatchObject({
      zoom: 1,
      overlay: "none",
    });
  });

  it("offers every implemented overlay level and zoom step", () => {
    expect(mediaOverlayOptions.map((o) => o.value)).toEqual(["none", "soft", "medium", "intense"]);
    expect(mediaZoomOptions.map((o) => o.value)).toEqual(["1", "1.15", "1.3", "1.5"]);
  });

  it("resolves crop, zoom and overlay for the shared photo renderer", () => {
    expect(mediaPhotoStyle({ pos: "top left" })).toMatchObject({
      objectFit: "cover",
      objectPosition: "top left",
    });
    expect(mediaPhotoStyle({})).not.toHaveProperty("transform");
    expect(mediaPhotoStyle({ zoom: "1.3" })).toMatchObject({
      objectPosition: "center",
      transform: "scale(1.3)",
    });

    expect(mediaOverlayFromProps({ overlay: "soft" })).toBe("soft");
    expect(mediaOverlayFromProps({ overlay: "intense" })).toBe("intense");
    expect(mediaOverlayFromProps(undefined)).toBe("none");
    expect(mediaOverlayStyleFromProps({ overlay: "none" })).toBeUndefined();

    const overlay = mediaOverlayStyleFromProps({ overlay: "intense", overlayColor: "#000000" });
    expect(overlay).toMatchObject({ backgroundColor: "#000000", opacity: 0.5 });
    // z-index is dropped on purpose: the node relies on DOM order.
    expect(overlay).not.toHaveProperty("zIndex");
  });
});
