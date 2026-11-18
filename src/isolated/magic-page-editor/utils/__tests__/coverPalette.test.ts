import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  COVER_ANALYSIS_FAILED,
  COVER_ANALYSIS_MESSAGES,
  COVER_PALETTE_IMAGE_SRC_KEY,
  COVER_PALETTE_MODE_KEY,
  COVER_PALETTE_SOURCE_KEY,
  coverPaletteImageSrc,
  coverPaletteIsStale,
  coverPaletteProvenance,
  ensureContrast,
  extractCoverColors,
  hasCoverPalette,
  hexToRgb,
  pickAccentSample,
  proposeCoverPalettes,
  readableOn,
  rgbToHex,
  rgbToHsl,
  type CoverAnalysisErrorCode,
  type CoverImageData,
  type CoverPaletteKind,
  type CoverPaletteProposal,
} from "../coverPalette";
import { contrastRatio as sharedContrastRatio } from "../brandingContrast";

/**
 * "Combinar colores con mi portada" — the pure half of the feature.
 *
 * These tests hold the two promises the directive makes about the analysis: it
 * is deterministic (same cover, same three proposals, every time) and the
 * proposals are legible (real WCAG ratios, not assumed ones). The DOM boundary
 * itself — canvas, CORS — is exercised in the panel test.
 */

type Pixel = [number, number, number] | [number, number, number, number];

function imageOf(pixels: Pixel[]): CoverImageData {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach((pixel, index) => {
    data[index * 4] = pixel[0];
    data[index * 4 + 1] = pixel[1];
    data[index * 4 + 2] = pixel[2];
    data[index * 4 + 3] = pixel[3] ?? 255;
  });
  return { data };
}

function repeat(pixel: Pixel, times: number): Pixel[] {
  return Array.from({ length: times }, () => pixel);
}

/** A cover with a clear subject: mostly muted clay, with a teal feature. */
function clayCover(): CoverImageData {
  return imageOf([
    ...repeat([196, 154, 122], 120),
    ...repeat([42, 96, 104], 60),
    ...repeat([240, 236, 228], 20),
  ]);
}

function assertProposalLegibility(proposal: CoverPaletteProposal) {
  const { tokens } = proposal;
  const text = hexToRgb(tokens.textColor);
  const bg = hexToRgb(tokens.bg);
  const accent = hexToRgb(tokens.accent);
  const accentFg = hexToRgb(tokens.accentFg);
  expect(text, `${proposal.kind}: textColor must be hex`).not.toBeNull();
  expect(bg, `${proposal.kind}: bg must be hex`).not.toBeNull();
  expect(accent, `${proposal.kind}: accent must be hex`).not.toBeNull();
  expect(accentFg, `${proposal.kind}: accentFg must be hex`).not.toBeNull();
  // The two floors the directive names, measured — not assumed.
  expect(contrastRatio(text!, bg!), `${proposal.kind}: text vs bg`).toBeGreaterThanOrEqual(4.5);
  expect(
    contrastRatio(accentFg!, accent!),
    `${proposal.kind}: accentFg vs accent`,
  ).toBeGreaterThanOrEqual(3);
}

describe("cover palette — extraction is deterministic", () => {
  it("1) the same pixels always produce the same samples", () => {
    const cover = clayCover();
    const first = extractCoverColors(cover);
    const second = extractCoverColors(cover);
    expect(second).toEqual(first);
  });

  it("2) the most represented colour comes first, with its real share", () => {
    const samples = extractCoverColors(clayCover());
    expect(samples[0]!.hex).toBe("#C49A7A");
    expect(samples[0]!.share).toBeCloseTo(120 / 200, 5);
  });

  it("3) fully transparent pixels are ignored", () => {
    const samples = extractCoverColors(imageOf([...repeat([42, 96, 104], 10), [255, 0, 0, 0]]));
    expect(samples.map((sample) => sample.hex)).toEqual(["#2A6068"]);
  });

  it("4) a fully transparent image yields nothing", () => {
    expect(
      extractCoverColors(
        imageOf([
          [255, 0, 0, 0],
          [0, 0, 0, 10],
        ]),
      ),
    ).toEqual([]);
  });

  it("5) an empty buffer yields nothing", () => {
    expect(extractCoverColors({ data: new Uint8ClampedArray(0) })).toEqual([]);
  });

  it("6) the accent pick prefers a saturated subject over a larger grey field", () => {
    const samples = extractCoverColors(
      imageOf([...repeat([128, 128, 128], 200), ...repeat([42, 96, 104], 40)]),
    );
    expect(samples[0]!.hex).toBe("#808080");
    expect(pickAccentSample(samples)!.hex).toBe("#2A6068");
  });
});

describe("cover palette — three proposals, always legible", () => {
  it("7) exactly three proposals, in the order Natural / Elegante / Vibrante", () => {
    const proposals = proposeCoverPalettes(extractCoverColors(clayCover()));
    expect(proposals.map((item) => item.kind)).toEqual(["natural", "elegant", "vibrant"]);
    expect(proposals.map((item) => item.label)).toEqual(["Natural", "Elegante", "Vibrante"]);
  });

  it("8) each proposal carries exactly the seven tokens the editor reads", () => {
    const proposals = proposeCoverPalettes(extractCoverColors(clayCover()));
    proposals.forEach((proposal) => {
      expect(Object.keys(proposal.tokens).sort()).toEqual([
        "accent",
        "accentFg",
        "bg",
        "lineColor",
        "mutedColor",
        "surfaceColor",
        "textColor",
      ]);
      Object.values(proposal.tokens).forEach((value) => {
        expect(value, `${proposal.kind}: ${value}`).toMatch(/^#[0-9A-F]{6}$/);
      });
    });
  });

  it("9) text clears 4.5:1 on the background and accentFg clears 3:1 on the accent", () => {
    proposeCoverPalettes(extractCoverColors(clayCover())).forEach(assertProposalLegibility);
  });

  it("10) the three proposals are genuinely different readings of the cover", () => {
    const proposals = proposeCoverPalettes(extractCoverColors(clayCover()));
    const accents = proposals.map((item) => item.tokens.accent);
    expect(new Set(accents).size).toBe(3);
    const backgrounds = proposals.map((item) => item.tokens.bg);
    expect(new Set(backgrounds).size).toBe(3);
  });

  it("11) saturation rises Natural -> Elegante -> Vibrante", () => {
    const proposals = proposeCoverPalettes(extractCoverColors(clayCover()));
    const saturation = proposals.map((item) => rgbToHsl(hexToRgb(item.tokens.accent)!).s);
    expect(saturation[1]!).toBeLessThan(saturation[0]!);
    expect(saturation[0]!).toBeLessThan(saturation[2]!);
  });

  it("12) Vibrante is intense but never neon", () => {
    const proposals = proposeCoverPalettes(extractCoverColors(clayCover()));
    const vibrant = proposals[2]!;
    const accent = rgbToHsl(hexToRgb(vibrant.tokens.accent)!);
    expect(accent.s).toBeLessThanOrEqual(0.85);
    expect(accent.l).toBeLessThanOrEqual(0.5);
    // Vibrante also keeps a clean page rather than tinting the background.
    expect(rgbToHsl(hexToRgb(vibrant.tokens.bg)!).l).toBeGreaterThan(0.95);
  });

  it("13) the same cover always produces the same proposals", () => {
    const first = proposeCoverPalettes(extractCoverColors(clayCover()));
    const second = proposeCoverPalettes(extractCoverColors(clayCover()));
    expect(second).toEqual(first);
  });

  it("14) no samples means no proposals", () => {
    expect(proposeCoverPalettes([])).toEqual([]);
  });
});

describe("cover palette — hostile covers stay legible", () => {
  const covers: Array<[string, Pixel[]]> = [
    ["a pure white cover", repeat([255, 255, 255], 200)],
    ["a pure black cover", repeat([0, 0, 0], 200)],
    ["a mid grey cover", repeat([128, 128, 128], 200)],
    ["a saturated yellow cover", repeat([255, 199, 0], 200)],
    ["a saturated blue cover", repeat([13, 71, 161], 200)],
    ["a very light cover", repeat([250, 248, 244], 200)],
    ["a very dark cover", repeat([12, 14, 18], 200)],
  ];

  covers.forEach(([name, pixels]) => {
    it(`15) ${name} still yields three legible proposals`, () => {
      const proposals = proposeCoverPalettes(extractCoverColors(imageOf(pixels)));
      expect(proposals).toHaveLength(3);
      proposals.forEach(assertProposalLegibility);
    });
  });

  it("16) a greyscale cover keeps neutral accents instead of inventing a hue", () => {
    const proposals = proposeCoverPalettes(
      extractCoverColors(imageOf(repeat([128, 128, 128], 200))),
    );
    proposals.forEach((proposal) => {
      const accent = hexToRgb(proposal.tokens.accent)!;
      // A true grey has equal channels; allow one step of rounding.
      expect(
        Math.max(accent.r, accent.g, accent.b) - Math.min(accent.r, accent.g, accent.b),
      ).toBeLessThanOrEqual(1);
    });
  });
});

describe("cover palette — the contrast helpers themselves", () => {
  it("17) ensureContrast only ever raises the ratio and reaches the floor", () => {
    const backgrounds = ["#FFFFFF", "#000000", "#F6F0E6", "#101418", "#FFC700"];
    const foregrounds = ["#EEEEEE", "#111111", "#8A8A8A", "#FBF6EE"];
    backgrounds.forEach((bg) => {
      foregrounds.forEach((fg) => {
        const bgRgb = hexToRgb(bg)!;
        const fgRgb = hexToRgb(fg)!;
        const before = contrastRatio(fgRgb, bgRgb);
        const after = ensureContrast(fgRgb, bgRgb, 4.5);
        expect(contrastRatio(after, bgRgb)).toBeGreaterThanOrEqual(before);
        expect(contrastRatio(after, bgRgb)).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  it("18) ensureContrast is a no-op when the pair already passes", () => {
    const black = hexToRgb("#000000")!;
    const white = hexToRgb("#FFFFFF")!;
    expect(ensureContrast(black, white, 4.5)).toEqual(black);
  });

  it("19) readableOn keeps the editor threshold: dark ink on light media, cream on dark", () => {
    expect(rgbToHex(readableOn(hexToRgb("#FFFFFF")!))).toBe("#211D19");
    expect(rgbToHex(readableOn(hexToRgb("#101418")!))).toBe("#FBF6EE");
  });

  it("20) the WCAG maths is the shared, already-tested implementation", () => {
    // Not a restatement: if coverPalette ever drifts from brandingContrast, the
    // palette floors and the branding line would disagree about "readable".
    const pairs: Array<[string, string]> = [
      ["#FFFFFF", "#000000"],
      ["#C49A7A", "#F6F0E6"],
      ["#0D47A1", "#FFFFFF"],
      ["#FFC700", "#1C2F33"],
    ];
    pairs.forEach(([a, b]) => {
      expect(contrastRatio(hexToRgb(a)!, hexToRgb(b)!)).toBeCloseTo(sharedContrastRatio(a, b)!, 10);
    });
  });
});

/* ------------------------------------------------------------------ */
/* M1 — procedencia: solo strings, sin píxeles ni datos personales     */
/* ------------------------------------------------------------------ */

describe("cover palette — provenance", () => {
  it("21) provenance is exactly three string props, and nothing about the pixels", () => {
    (["natural", "elegant", "vibrant"] as CoverPaletteKind[]).forEach((kind) => {
      const provenance = coverPaletteProvenance(kind, "/uploads/cover-a.jpg");
      expect(Object.keys(provenance).sort()).toEqual([
        COVER_PALETTE_IMAGE_SRC_KEY,
        COVER_PALETTE_MODE_KEY,
        COVER_PALETTE_SOURCE_KEY,
      ]);
      expect(provenance).toEqual({
        coverPaletteSource: "hero",
        coverPaletteMode: kind,
        coverPaletteImageSrc: "/uploads/cover-a.jpg",
      });
      Object.values(provenance).forEach((value) => expect(typeof value).toBe("string"));
    });
  });

  it("22) a page only counts as cover-derived when it says so", () => {
    expect(hasCoverPalette({})).toBe(false);
    expect(hasCoverPalette({ [COVER_PALETTE_SOURCE_KEY]: "" })).toBe(false);
    expect(hasCoverPalette({ [COVER_PALETTE_SOURCE_KEY]: "template" })).toBe(false);
    expect(hasCoverPalette({ [COVER_PALETTE_SOURCE_KEY]: "hero" })).toBe(true);
  });

  it("23) the recorded image is read back verbatim, and empty when absent", () => {
    expect(coverPaletteImageSrc({})).toBe("");
    expect(coverPaletteImageSrc({ [COVER_PALETTE_IMAGE_SRC_KEY]: "/uploads/cover-a.jpg" })).toBe(
      "/uploads/cover-a.jpg",
    );
  });

  it("24) staleness is only ever claimed for a cover-derived palette", () => {
    const derived = (src: string) => ({
      [COVER_PALETTE_SOURCE_KEY]: "hero",
      [COVER_PALETTE_MODE_KEY]: "natural",
      [COVER_PALETTE_IMAGE_SRC_KEY]: src,
    });
    // No provenance at all: nothing was derived, so nothing can be stale.
    expect(coverPaletteIsStale({}, "/uploads/cover-b.jpg")).toBe(false);
    // The cover is the one the palette was read from.
    expect(coverPaletteIsStale(derived("/uploads/cover-a.jpg"), "/uploads/cover-a.jpg")).toBe(
      false,
    );
    // The cover moved on: this is the one case the notice exists for.
    expect(coverPaletteIsStale(derived("/uploads/cover-a.jpg"), "/uploads/cover-b.jpg")).toBe(true);
    // A recorded-but-empty src is not evidence of a change.
    expect(coverPaletteIsStale(derived(""), "/uploads/cover-b.jpg")).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* M3 — un mensaje por causa                                           */
/* ------------------------------------------------------------------ */

describe("cover palette — analysis messages", () => {
  const CODES: CoverAnalysisErrorCode[] = ["load", "cors", "empty", "unsupported"];

  it("25) every cause has a headline and a distinct, actionable detail", () => {
    CODES.forEach((code) => {
      const message = COVER_ANALYSIS_MESSAGES[code];
      expect(message.headline).toBe(COVER_ANALYSIS_FAILED);
      expect(message.detail.length).toBeGreaterThan(0);
    });
    const details = CODES.map((code) => COVER_ANALYSIS_MESSAGES[code].detail);
    expect(new Set(details).size).toBe(CODES.length);
  });

  it("26) the approved sentence is still the one shown on failure", () => {
    expect(COVER_ANALYSIS_FAILED).toBe("No pudimos analizar automáticamente esta imagen.");
  });
});
