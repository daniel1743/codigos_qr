import { describe, expect, it } from "vitest";
import { heroVariants } from "../components/editor/controls/HeroVariantPicker";
import { heroFusionOptions } from "../components/editor/controls/HeroFusionPicker";
import {
  mediaOverlayOptions,
  mediaZoomOptions,
} from "../components/editor/controls/MediaTreatmentPicker";
import { mediaOverlayStyleFromProps, mediaPhotoStyle } from "../utils/styles";
import { radiusFor } from "../components/editor/EditableAvatar";
import { galleryLayouts } from "../components/blocks/GalleryGrid";
import { cardFamilies, cardFamilyOrder } from "../data/cardFamilies";
import { miniGalleryVariants, pageFamilyVariants } from "../data/templates";
import { layoutOptions } from "../utils/cardLayout";
import { blockLabels } from "../data/blockKit";
import {
  resolveVideo,
  videoCover,
  videoHasProviderTreatment,
  videoStatusLabel,
} from "../utils/video";
import type { CardFamily, CardLayout, TemplateId } from "../types/editor";

/* ------------------------------------------------------------------ */
/* HERO — 30 variants                                                  */
/* ------------------------------------------------------------------ */

const REQUIRED_HERO_VARIANTS = [
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
  // L2.1. Appending a composition to this list IS the contract change: the set
  // is meant to be exact, so widening it must be deliberate and named here.
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
] as const;

describe("Bridge 4 · Portada > Variante exposes every required hero variant", () => {
  it("lists exactly the required variants, in order and without duplicates", () => {
    // `REQUIRED_HERO_VARIANTS` above is the contract; the count is derived from
    // it so the list — not a magic number — is what has to be edited.
    expect(heroVariants.map((v) => v.value)).toEqual([...REQUIRED_HERO_VARIANTS]);
    expect(new Set(heroVariants.map((v) => v.value)).size).toBe(REQUIRED_HERO_VARIANTS.length);
  });

  it("gives every one of them its own label and hint, so none is a dead option", () => {
    expect(new Set(heroVariants.map((v) => v.label)).size).toBe(heroVariants.length);
    expect(new Set(heroVariants.map((v) => v.hint)).size).toBe(heroVariants.length);
    for (const variant of heroVariants) {
      expect(variant.label.trim().length).toBeGreaterThan(2);
      expect(variant.hint.trim().length).toBeGreaterThan(8);
    }
  });
});

/* ------------------------------------------------------------------ */
/* HERO media controls                                                 */
/* ------------------------------------------------------------------ */

describe("Bridge 4 · hero media controls", () => {
  it("exposes the four overlay levels and the quick zoom steps", () => {
    expect(mediaOverlayOptions.map((o) => o.value)).toEqual(["none", "soft", "medium", "intense"]);
    expect(mediaZoomOptions.map((o) => o.value)).toEqual(["1", "1.15", "1.3", "1.5"]);
  });

  it("applies free crop X/Y and continuous zoom to the photo", () => {
    expect(mediaPhotoStyle({ cropX: "20", cropY: "80" })).toMatchObject({
      objectPosition: "20% 80%",
    });
    expect(mediaPhotoStyle({ zoom: "1.37" })).toMatchObject({
      objectPosition: "center",
      transform: "scale(1.37)",
    });
  });

  it("honours the fit contract instead of hardcoding cover", () => {
    expect(mediaPhotoStyle({ fit: "contain" })).toMatchObject({ objectFit: "contain" });
    expect(mediaPhotoStyle({})).toMatchObject({ objectFit: "cover" });
    expect(mediaPhotoStyle({ fit: "cover" })).toMatchObject({ objectFit: "cover" });
  });

  it("keeps every crop axis as a quick position preset", () => {
    expect(mediaPhotoStyle({ pos: "top left" })).toMatchObject({ objectPosition: "top left" });
    expect(mediaPhotoStyle({ pos: "bottom right" })).toMatchObject({
      objectPosition: "bottom right",
    });
  });

  it("renders the overlay colour through the shared engine", () => {
    expect(mediaOverlayStyleFromProps({ overlay: "none" })).toBeUndefined();
    expect(
      mediaOverlayStyleFromProps({ overlay: "intense", overlayColor: "#1f4e55" }),
    ).toMatchObject({ backgroundColor: "#1f4e55" });
  });

  it("exposes the five fusion modes on the shared picker", () => {
    expect(heroFusionOptions.map((o) => o.value)).toEqual([
      "none",
      "fade",
      "halo",
      "organic",
      "dominant",
    ]);
    expect(new Set(heroFusionOptions.map((o) => o.hint)).size).toBe(5);
  });
});

/* ------------------------------------------------------------------ */
/* AVATAR                                                              */
/* ------------------------------------------------------------------ */

describe("Bridge 4 · avatar", () => {
  it("exposes four visibly different shapes, including square", () => {
    const shapes = ["circle", "rounded", "square", "arch"] as const;
    const radii = shapes.map((shape) => radiusFor(shape, 120));
    expect(new Set(radii).size).toBe(4);
    expect(radiusFor("square", 120)).toBe("0px");
    expect(radiusFor("circle", 120)).toBe("9999px");
  });
});

/* ------------------------------------------------------------------ */
/* PAGE VARIANTS                                                       */
/* ------------------------------------------------------------------ */

const REQUIRED_PAGE_VARIANTS: Record<TemplateId, string[]> = {
  bio: ["signature", "soft-grid", "portrait", "social", "journal", "minimal", "studio", "monogram"],
  business: [
    "atelier",
    "clinical",
    "concierge",
    "service-grid",
    "story",
    "booking",
    "local",
    "statement",
  ],
  portfolio: [
    "archive",
    "exhibition",
    "contact-sheet",
    "monograph",
    "cinema",
    "index",
    "case-study",
    "nocturne",
  ],
};

describe("Bridge 4 · page family variants", () => {
  it("exposes Bio 8/8, Business 8/8 and Portfolio 8/8", () => {
    for (const templateId of ["bio", "business", "portfolio"] as TemplateId[]) {
      const exposed = pageFamilyVariants[templateId].map((v) => v.id);
      expect(exposed).toEqual(REQUIRED_PAGE_VARIANTS[templateId]);
      expect(exposed).toHaveLength(8);
    }
  });

  it("exposes Mini Galería 5/5", () => {
    expect(miniGalleryVariants.map((v) => v.id)).toEqual([
      "gallery-editorial",
      "gallery-mosaic",
      "gallery-filmstrip",
      "gallery-masonry",
      "gallery-stacked",
    ]);
  });
});

/* ------------------------------------------------------------------ */
/* CARD FAMILIES                                                       */
/* ------------------------------------------------------------------ */

const REQUIRED_CARD_VARIANTS: Record<CardFamily, number> = {
  catalog: 8,
  page: 8,
  portfolio: 8,
  menu: 6,
  store: 6,
};

describe("Bridge 4 · card families", () => {
  it("exposes catalog 8, page 8, portfolio 8, menu 6 and store 6", () => {
    for (const family of cardFamilyOrder) {
      const variants = cardFamilies[family].variants;
      expect(variants).toHaveLength(REQUIRED_CARD_VARIANTS[family]);
      expect(new Set(variants.map((v) => v.id)).size).toBe(REQUIRED_CARD_VARIANTS[family]);
    }
  });

  it("covers every shared card layout the renderer implements", () => {
    const implemented = new Set(
      cardFamilyOrder.flatMap((family) =>
        cardFamilies[family].variants.map((variant) => variant.layout),
      ),
    );
    for (const layout of [
      "left",
      "right",
      "top",
      "bottom",
      "editorial",
      "compact",
      "balanced",
      "highlight",
      "beforeAfter",
    ] as CardLayout[]) {
      expect(implemented.has(layout)).toBe(true);
    }
  });

  it("keeps before/after only where the family has real before images", () => {
    const withBeforeAfter = cardFamilyOrder.filter((family) =>
      cardFamilies[family].variants.some((v) => v.layout === "beforeAfter"),
    );
    expect(withBeforeAfter).toEqual(["portfolio"]);
    for (const family of withBeforeAfter) {
      expect(cardFamilies[family].items.every((item) => typeof item.imageBefore === "string")).toBe(
        true,
      );
    }
  });

  it("keeps every optional card field reachable from the data", () => {
    const fields = new Set(
      cardFamilyOrder.flatMap((family) =>
        cardFamilies[family].items.flatMap((item) => Object.keys(item)),
      ),
    );
    for (const field of [
      "badge",
      "price",
      "previousPrice",
      "description",
      "cta",
      "eyebrow",
      "meta",
    ]) {
      expect(fields.has(field)).toBe(true);
    }
  });

  it("exposes the per-card layout picker options", () => {
    expect(layoutOptions.map((o) => o.value)).toEqual([
      "left",
      "right",
      "top",
      "bottom",
      "balanced",
      "editorial",
      "compact",
    ]);
  });
});

/* ------------------------------------------------------------------ */
/* GALLERY                                                             */
/* ------------------------------------------------------------------ */

describe("Bridge 4 · gallery", () => {
  it("exposes the gallery layouts", () => {
    // The enumeration IS the contract: every valid layout, in picker order.
    // L2.5 appended two compositions for the target's catalog and gallery
    // sections; the five that preceded them keep their ids, order and meaning,
    // so a gallery that already stores one of them cannot move.
    expect(galleryLayouts.map((l) => l.value)).toEqual([
      "fila",
      "mosaico",
      "carrusel",
      "masonry",
      "stacked",
      "destacada",
      "bloques",
    ]);
    // Derived from the contract, not a magic number — the count is a
    // consequence of the list above, and hardcoding it here is how the previous
    // version of this test became a fake failure when a layout was added.
    expect(new Set(galleryLayouts.map((l) => l.label)).size).toBe(galleryLayouts.length);
  });

  /* ------------------------------------------------------------------ */
  /* VIDEO                                                               */
  /* ------------------------------------------------------------------ */

  describe("Bridge 4 · video", () => {
    it("recognises YouTube and derives its thumbnail and embed", () => {
      const youtube = resolveVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(youtube).toEqual({
        source: "youtube",
        id: "dQw4w9WgXcQ",
        embed: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
        providerCover: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      });
      expect(resolveVideo("https://youtu.be/dQw4w9WgXcQ").id).toBe("dQw4w9WgXcQ");
      expect(videoStatusLabel(youtube)).toBe("YouTube");
      expect(videoCover(youtube, "https://cdn/cover.jpg", "https://cdn/fallback.jpg")).toBe(
        "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      );
    });

    it("gives Vimeo its own treatment and keeps the author cover", () => {
      const vimeo = resolveVideo("https://vimeo.com/76979871");
      expect(vimeo.source).toBe("vimeo");
      expect(vimeo.id).toBe("76979871");
      expect(vimeo.embed).toBe("https://player.vimeo.com/video/76979871?autoplay=1");
      expect(videoHasProviderTreatment(vimeo)).toBe(true);
      expect(videoStatusLabel(vimeo)).toBe("Vista previa Vimeo");
      expect(videoCover(vimeo, "https://cdn/cover.jpg", "https://cdn/fallback.jpg")).toBe(
        "https://cdn/cover.jpg",
      );
    });

    it("falls back elegantly for unknown and empty URLs", () => {
      const external = resolveVideo("https://cdn.example.com/clip.mp4");
      expect(external).toEqual({ source: "external", embed: null });
      expect(videoStatusLabel(external)).toBe("Vista previa");
      expect(videoCover(external, undefined, "https://cdn/fallback.jpg")).toBe(
        "https://cdn/fallback.jpg",
      );

      const empty = resolveVideo("");
      expect(empty).toEqual({ source: "none", embed: null });
      expect(videoStatusLabel(empty)).toBe("Pega un enlace");
      expect(videoHasProviderTreatment(empty)).toBe(false);
      expect(videoHasProviderTreatment(resolveVideo("https://youtu.be/x1"))).toBe(false);
    });

    it("keeps the video block reachable from the block kit with its own label", () => {
      expect(blockLabels.video).toBe("Vídeo");
    });
  });
});
