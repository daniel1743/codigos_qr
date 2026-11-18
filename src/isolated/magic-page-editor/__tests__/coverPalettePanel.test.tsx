// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorProvider, useEditor, type EditorValue } from "../contexts/EditorContext";
import {
  COVER_PALETTE_PREMIUM_NOTICE,
  CoverPalettePanel,
} from "../components/editor/controls/CoverPalettePanel";
import type { PageDoc } from "../types/editor";

// The canvas/CORS boundary is the one part unit tests cannot exercise: happy-dom
// has no 2D context. It is replaced here and asserted in its own right (test 12)
// so the panel's contract — local preview, one transactional write — is what
// these tests actually measure.
vi.mock("../utils/coverPalette", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/coverPalette")>();
  return { ...actual, analyzeCoverImage: vi.fn() };
});

/**
 * The two boundaries this panel talks to, replaced.
 *
 * `sonner` is mocked partially: only `toast` is swapped, so the module the app
 * actually ships still loads and nothing else changes shape.
 *
 * `plan-server` is mocked WHOLE, with no `importOriginal`: the real module pulls
 * in the server billing stack, and the point of these tests is the panel's use
 * of the boundary, not the boundary itself (which has its own suite).
 */
const { toastMock, planMock } = vi.hoisted(() => {
  const mock = vi.fn();
  return {
    toastMock: Object.assign(mock, { error: vi.fn(), success: vi.fn() }),
    planMock: vi.fn(),
  };
});

vi.mock("sonner", async (importOriginal) => ({
  ...(await importOriginal<typeof import("sonner")>()),
  toast: toastMock,
}));

vi.mock("../../../lib/billing/plan-server", () => ({ getMyPlanFn: planMock }));

import {
  analyzeCoverImage,
  CoverPaletteError,
  COVER_PALETTE_IMAGE_SRC_KEY,
  COVER_PALETTE_MODE_KEY,
  COVER_PALETTE_SOURCE_KEY,
  extractCoverColors,
  proposeCoverPalettes,
  type CoverAnalysisErrorCode,
  type CoverImageData,
  type CoverPaletteProposal,
} from "../utils/coverPalette";
import {
  hydrateMagicEditorState,
  serializeMagicEditorState,
} from "../../../features/magic-page-editor-production/magic-document";

/**
 * "Combinar colores con mi portada" — the panel contract.
 *
 * The two promises the directive makes about the UI are what these tests hold:
 * looking at a proposal changes nothing (no document write, no undo entry), and
 * applying one is a single transaction (one write, one undo, cleared palette and
 * bgOverride). The provenance, change-notice, error and restore behaviour is
 * pinned on top of that.
 */

function pixels(colours: Array<[number, number, number]>): CoverImageData {
  const data = new Uint8ClampedArray(colours.length * 4);
  colours.forEach(([r, g, b], index) => {
    data[index * 4] = r;
    data[index * 4 + 1] = g;
    data[index * 4 + 2] = b;
    data[index * 4 + 3] = 255;
  });
  return { data };
}

function coverPixels(): CoverImageData {
  const colours: Array<[number, number, number]> = [];
  for (let i = 0; i < 120; i += 1) colours.push([196, 154, 122]);
  for (let i = 0; i < 60; i += 1) colours.push([42, 96, 104]);
  return pixels(colours);
}

/** A different cover, so "Recalcular" has something genuinely new to read. */
function otherCoverPixels(): CoverImageData {
  const colours: Array<[number, number, number]> = [];
  for (let i = 0; i < 120; i += 1) colours.push([92, 118, 74]);
  for (let i = 0; i < 60; i += 1) colours.push([198, 76, 52]);
  return pixels(colours);
}

const PROPOSALS: CoverPaletteProposal[] = proposeCoverPalettes(extractCoverColors(coverPixels()));
const OTHER_PROPOSALS: CoverPaletteProposal[] = proposeCoverPalettes(
  extractCoverColors(otherCoverPixels()),
);

/** A page that already carries the eight tokens the generator writes. */
function docWithBrandColors(): PageDoc {
  return {
    blocks: [
      { key: "hero", type: "hero" },
      { key: "services", type: "services" },
    ],
    texts: { "hero.title": "Cocina Aurora" },
    textStyles: { "hero.title": { align: "center" } },
    props: {
      page: {
        family: "business",
        font: "editorial",
        bg: "#F6F0E6",
        surfaceColor: "#FFFFFF",
        mutedColor: "#5E6D6F",
        lineColor: "#E3D9CE",
        accent: "#8A5A34",
        accentFg: "#FFFFFF",
        palette: "arena",
        bgOverride: "#F6F0E6",
      },
      "block:hero": { variant: "fullBleed", height: "L", overlay: "medium", fusion: "none" },
    },
    removed: {},
  };
}

/** A page that has never chosen a colour. */
function docWithoutColors(): PageDoc {
  return {
    ...docWithBrandColors(),
    props: {
      page: { family: "business", font: "editorial" },
      "block:hero": { variant: "fullBleed", height: "L", overlay: "medium", fusion: "none" },
    },
  };
}

/**
 * A page whose colours were derived from a cover — the state the change notice
 * exists for. `heroSrc` may differ from `paletteSrc`, which is exactly the
 * "la portada cambió" condition.
 */
function docWithDerivedPalette(options?: { paletteSrc?: string; heroSrc?: string }): PageDoc {
  const paletteSrc = options?.paletteSrc ?? "/uploads/cover-a.jpg";
  const heroSrc = options?.heroSrc ?? paletteSrc;
  return {
    ...docWithBrandColors(),
    props: {
      page: {
        ...docWithBrandColors().props["page"]!,
        bg: "#F6F5F3",
        textColor: "#2B231D",
        mutedColor: "#7F6E61",
        surfaceColor: "#FEFEFE",
        lineColor: "#E4E0DD",
        accent: "#A57550",
        accentFg: "#211D19",
        palette: "",
        bgOverride: "",
        [COVER_PALETTE_SOURCE_KEY]: "hero",
        [COVER_PALETTE_MODE_KEY]: "natural",
        [COVER_PALETTE_IMAGE_SRC_KEY]: paletteSrc,
      },
      "block:hero": {
        variant: "fullBleed",
        height: "L",
        overlay: "medium",
        fusion: "none",
        src: heroSrc,
      },
    },
    removed: {},
  };
}

/**
 * How the plan boundary answers. `"pending"` is the loading window: a promise
 * that never settles, which is exactly what a slow session lookup looks like.
 * A promise the test settles by hand models the same thing with an ending.
 */
type PlanAnswer = { isPro: boolean } | "error" | "pending" | Promise<{ isPro: boolean }>;

/** A plan lookup the test resolves when it chooses to. */
function deferredPlan() {
  let settle!: (decision: { isPro: boolean }) => void;
  const promise = new Promise<{ isPro: boolean }>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

/**
 * Mounts and then WAITS for the entitlement lookup to settle.
 *
 * The wait is the point. The panel starts Free and only the server's answer can
 * unlock it, so a test that interacted before this resolved would be measuring
 * the loading state rather than the behaviour it names. `isPro: true` (Premium)
 * is the default because that is the behaviour the M1–M5 tests below pin; the
 * gate's own tests pass `{ isPro: false }` explicitly.
 */
async function mount(initial: PageDoc, plan: PlanAnswer = { isPro: true }) {
  if (plan === "error") planMock.mockRejectedValue(new Error("no session"));
  else if (plan === "pending") planMock.mockReturnValue(new Promise(() => {}));
  else if (typeof plan === "object" && "then" in plan) planMock.mockReturnValue(plan);
  else planMock.mockResolvedValue(plan);

  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  let api: EditorValue | null = null;
  function Probe() {
    api = useEditor();
    return null;
  }
  await act(async () => {
    root.render(
      <EditorProvider
        initialTemplate="business"
        initialDocument={{ templateId: "business", doc: initial }}
      >
        <Probe />
        <CoverPalettePanel />
      </EditorProvider>,
    );
  });
  return {
    host,
    root,
    page: () => api!.doc.props.page ?? {},
    api: () => api!,
  };
}

function maybeButton(host: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(host.querySelectorAll("button")).find((element) =>
    (element.textContent ?? "").includes(text),
  ) as HTMLButtonElement | undefined;
}

function button(host: HTMLElement, text: string): HTMLButtonElement {
  const found = maybeButton(host, text);
  if (!found) throw new Error(`No button matching "${text}"`);
  return found;
}

/**
 * The colour decision on the page, isolated from everything else (the hero src
 * lives in a different prop record, so a cover change never shows up here).
 */
function colourDecision(page: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    [
      "bg",
      "bgOverride",
      "palette",
      "textColor",
      "mutedColor",
      "surfaceColor",
      "lineColor",
      "accent",
      "accentFg",
    ].map((key) => [key, page[key] ?? ""]),
  );
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.click();
    await Promise.resolve();
  });
}

async function analyze(host: HTMLElement) {
  await click(button(host, "Combinar colores con mi portada"));
}

/** Is this control presented as a Pro-only one? The badge is inside it, or right after it. */
function badged(element: HTMLElement): boolean {
  return (
    !!element.querySelector('[data-testid="cover-palette-pro-badge"]') ||
    element.nextElementSibling?.matches('[data-testid="cover-palette-pro-badge"]') === true
  );
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.mocked(analyzeCoverImage).mockReset();
  vi.mocked(analyzeCoverImage).mockResolvedValue(PROPOSALS);
  planMock.mockReset();
  planMock.mockResolvedValue({ isPro: true });
  toastMock.mockClear();
  toastMock.error.mockClear();
  toastMock.success.mockClear();
});

afterEach(() => document.body.replaceChildren());

describe("CoverPalettePanel — the preview is local", () => {
  it("1) starts idle and writes nothing", async () => {
    const { host, page } = await mount(docWithoutColors());
    const before = structuredClone(page());
    expect(button(host, "Combinar colores con mi portada")).toBeTruthy();
    expect(page()).toEqual(before);
  });

  it("2) analysing does not touch the document", async () => {
    const { host, page } = await mount(docWithoutColors());
    const before = structuredClone(page());
    await analyze(host);
    expect(analyzeCoverImage).toHaveBeenCalledTimes(1);
    expect(page()).toEqual(before);
  });

  it("3) the three proposals and the mini preview appear, still without writing", async () => {
    const { host, page } = await mount(docWithoutColors());
    const before = structuredClone(page());
    await analyze(host);
    expect(button(host, "Natural")).toBeTruthy();
    expect(button(host, "Elegante")).toBeTruthy();
    expect(button(host, "Vibrante")).toBeTruthy();
    expect(host.querySelector('[data-testid="cover-palette-preview"]')).toBeTruthy();
    expect(page()).toEqual(before);
  });

  it("4) switching proposal re-renders the preview and still writes nothing", async () => {
    const { host, page, api } = await mount(docWithoutColors());
    const before = structuredClone(page());
    await analyze(host);
    const preview = host.querySelector('[data-testid="cover-palette-preview"]') as HTMLElement;
    const naturalBg = preview.style.background;
    await click(button(host, "Vibrante"));
    const vibrantBg = (host.querySelector('[data-testid="cover-palette-preview"]') as HTMLElement)
      .style.background;
    expect(vibrantBg).not.toBe(naturalBg);
    expect(page()).toEqual(before);
    expect(api().canUndo).toBe(false);
  });

  it("5) Cancelar leaves the document untouched and returns to idle", async () => {
    const { host, page, api } = await mount(docWithBrandColors());
    const before = structuredClone(page());
    await analyze(host);
    await click(button(host, "Probar paleta"));
    await click(button(host, "Cancelar"));
    expect(page()).toEqual(before);
    expect(api().canUndo).toBe(false);
    expect(button(host, "Combinar colores con mi portada")).toBeTruthy();
  });
});

describe("CoverPalettePanel — applying is one transaction", () => {
  it("6) Aplicar writes exactly the seven tokens and clears palette + bgOverride", async () => {
    const { host, page } = await mount(docWithBrandColors());
    await analyze(host);
    await click(button(host, "Probar paleta"));
    await click(button(host, "Elegante"));

    const chosen = PROPOSALS.find((item) => item.kind === "elegant")!;
    await click(button(host, "Aplicar colores"));

    const applied = page();
    expect({
      bg: applied["bg"],
      textColor: applied["textColor"],
      mutedColor: applied["mutedColor"],
      surfaceColor: applied["surfaceColor"],
      lineColor: applied["lineColor"],
      accent: applied["accent"],
      accentFg: applied["accentFg"],
    }).toEqual(chosen.tokens);
    // A named palette and a tonal override both outrank explicit tokens.
    expect(applied["palette"]).toBe("");
    expect(applied["bgOverride"]).toBe("");
    // Nothing else on the page moved.
    expect(applied["family"]).toBe("business");
    expect(applied["font"]).toBe("editorial");
  });

  it("7) one undo restores the previous palette exactly — one write, one entry", async () => {
    const { host, page, api } = await mount(docWithBrandColors());
    const before = structuredClone(page());
    await analyze(host);
    await click(button(host, "Probar paleta"));
    await click(button(host, "Aplicar colores"));
    expect(page()).not.toEqual(before);

    await act(async () => {
      api().undo();
    });
    expect(page()).toEqual(before);
    // The history is where it started: no intermediate step was recorded.
    expect(api().canUndo).toBe(false);
    expect(api().canRedo).toBe(true);
  });

  it("8) the apply is a single updateDoc, not seven setProp calls", async () => {
    // `docWithoutColors` has no explicit colours, so no confirmation is needed.
    const { host, api } = await mount(docWithoutColors());
    await analyze(host);
    const updateDoc = vi.spyOn(api(), "updateDoc");
    await click(button(host, "Vibrante"));
    await click(button(host, "Aplicar colores"));
    expect(updateDoc).toHaveBeenCalledTimes(1);
    updateDoc.mockRestore();
  });
});

describe("CoverPalettePanel — existing colours are not overwritten silently", () => {
  it('9) explicit colours ask first; "Mantener mis colores" writes nothing', async () => {
    const { host, page, api } = await mount(docWithBrandColors());
    const before = structuredClone(page());
    await analyze(host);
    expect(
      (host.textContent ?? "").includes("Encontramos una combinación que encaja con tu portada."),
    ).toBe(true);
    await click(button(host, "Mantener mis colores"));
    expect(page()).toEqual(before);
    expect(api().canUndo).toBe(false);
    expect(button(host, "Combinar colores con mi portada")).toBeTruthy();
  });

  it("10) a page with no colour props goes straight to the proposals", async () => {
    const { host } = await mount(docWithoutColors());
    await analyze(host);
    expect((host.textContent ?? "").includes("Encontramos una combinación")).toBe(false);
    expect(button(host, "Aplicar colores")).toBeTruthy();
  });
});

describe("CoverPalettePanel — failures never break the editor", () => {
  it("11) an unreadable image shows the approved message and leaves the document alone", async () => {
    vi.mocked(analyzeCoverImage).mockRejectedValue(new CoverPaletteError("cors", "tainted canvas"));
    const { host, page, api } = await mount(docWithBrandColors());
    const before = structuredClone(page());
    await analyze(host);
    expect(
      (host.textContent ?? "").includes("No pudimos analizar automáticamente esta imagen."),
    ).toBe(true);
    expect(page()).toEqual(before);
    expect(api().canUndo).toBe(false);
    // Recoverable: the panel offers the action again.
    await click(button(host, "Cerrar"));
    expect(button(host, "Combinar colores con mi portada")).toBeTruthy();
  });

  it("12) the cover analysed is the hero image, falling back to the template preview", async () => {
    const { host } = await mount(docWithoutColors());
    await analyze(host);
    // No `src` on the hero block, so the template's own cover is the subject.
    expect(analyzeCoverImage).toHaveBeenCalledWith(expect.stringContaining("/magic-page-editor/"));
  });
});

/* ------------------------------------------------------------------ */
/* M3 — un mensaje por causa, no un solo callejón sin salida           */
/* ------------------------------------------------------------------ */

describe("CoverPalettePanel — actionable errors (M3)", () => {
  const CASES: Array<[CoverAnalysisErrorCode, string]> = [
    ["load", "No se pudo cargar la imagen."],
    ["cors", "Está alojada fuera de tu página y bloquea la lectura de sus colores."],
    ["empty", "No encontramos colores suficientes en esta imagen."],
    ["unsupported", "Tu navegador no permite leer imágenes en este contexto."],
  ];

  it("13) each cause shows its own message, and all keep the approved sentence", async () => {
    for (const [code, detail] of CASES) {
      vi.mocked(analyzeCoverImage).mockRejectedValue(new CoverPaletteError(code, "boom"));
      const { host, page } = await mount(docWithoutColors());
      const before = structuredClone(page());
      await analyze(host);
      const text = host.textContent ?? "";
      expect(text, `${code}: headline`).toContain(
        "No pudimos analizar automáticamente esta imagen.",
      );
      expect(text, `${code}: detail`).toContain(detail);
      // A failure still never writes.
      expect(page()).toEqual(before);
    }
  });

  it("14) the four causes are actually distinguishable from one another", async () => {
    const rendered: string[] = [];
    for (const [code] of CASES) {
      vi.mocked(analyzeCoverImage).mockRejectedValue(new CoverPaletteError(code, "boom"));
      const { host } = await mount(docWithoutColors());
      await analyze(host);
      rendered.push(host.textContent ?? "");
    }
    expect(new Set(rendered).size).toBe(CASES.length);
  });
});

/* ------------------------------------------------------------------ */
/* M1 — procedencia: de dónde salió la paleta                          */
/* ------------------------------------------------------------------ */

describe("CoverPalettePanel — palette provenance (M1)", () => {
  it("15) applying records the origin, the mode and the image, as plain strings", async () => {
    const { host, page } = await mount(docWithoutColors());
    await analyze(host);
    await click(button(host, "Elegante"));
    await click(button(host, "Aplicar colores"));

    const applied = page();
    expect(applied[COVER_PALETTE_SOURCE_KEY]).toBe("hero");
    expect(applied[COVER_PALETTE_MODE_KEY]).toBe("elegant");
    // No `src` on the hero, so the analysed image is the template's own cover.
    expect(typeof applied[COVER_PALETTE_IMAGE_SRC_KEY]).toBe("string");
    expect(applied[COVER_PALETTE_IMAGE_SRC_KEY]).toContain("/magic-page-editor/");
    // The payload validator (document-session.ts) rejects any non-string value.
    Object.values(applied).forEach((value) => expect(typeof value).toBe("string"));
  });

  it("16) serialize/hydrate keeps the provenance — it survives the wire", async () => {
    const { host, api } = await mount(
      docWithDerivedPalette({ paletteSrc: "/uploads/cover-a.jpg" }),
    );
    const state = serializeMagicEditorState({ templateId: "business", doc: api().doc });
    const roundTripped = hydrateMagicEditorState(JSON.parse(JSON.stringify(state)));
    const page = roundTripped.doc.props["page"]!;
    expect(page[COVER_PALETTE_SOURCE_KEY]).toBe("hero");
    expect(page[COVER_PALETTE_MODE_KEY]).toBe("natural");
    expect(page[COVER_PALETTE_IMAGE_SRC_KEY]).toBe("/uploads/cover-a.jpg");
  });

  it("17) the provenance keys are not colour tokens, so they never trigger the colour warning", async () => {
    // A page whose ONLY colour-ish props are the provenance: nothing to protect.
    const { host } = await mount({
      ...docWithoutColors(),
      props: {
        page: {
          family: "business",
          [COVER_PALETTE_SOURCE_KEY]: "hero",
          [COVER_PALETTE_MODE_KEY]: "natural",
          [COVER_PALETTE_IMAGE_SRC_KEY]: "/uploads/cover-a.jpg",
        },
        "block:hero": { variant: "fullBleed", height: "L", src: "/uploads/cover-a.jpg" },
      },
    });
    await analyze(host);
    expect((host.textContent ?? "").includes("Encontramos una combinación")).toBe(false);
    expect(button(host, "Aplicar colores")).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* M2 — la portada cambia: avisar, nunca imponer                       */
/* ------------------------------------------------------------------ */

describe("CoverPalettePanel — the cover changed (M2)", () => {
  it("18) changing hero.src does NOT touch the colours on its own", async () => {
    const { host, page, api } = await mount(docWithDerivedPalette());
    const coloursBefore = colourDecision(page());
    await act(async () => {
      api().setProp("block:hero", "src", "/uploads/cover-b.jpg");
    });
    // Nothing ran, no colour moved: the change is inert until the owner acts.
    expect(analyzeCoverImage).not.toHaveBeenCalled();
    expect(colourDecision(page())).toEqual(coloursBefore);
    expect(host.textContent ?? "").not.toContain("Encontramos una combinación");
  });

  it("19) the notice appears only once the cover no longer matches the palette", async () => {
    const { host, api } = await mount(docWithDerivedPalette());
    const notice = "Tu portada cambió. ¿Quieres volver a combinar los colores?";
    // Same cover as the palette was read from: nothing to say.
    expect(host.textContent ?? "").not.toContain(notice);
    await act(async () => {
      api().setProp("block:hero", "src", "/uploads/cover-b.jpg");
    });
    expect(host.textContent ?? "").toContain(notice);
    expect(button(host, "Recalcular")).toBeTruthy();
    expect(button(host, "Mantener colores actuales")).toBeTruthy();
  });

  it("20) a page with colours but no derived palette never gets the notice", async () => {
    const { host, api } = await mount(docWithBrandColors());
    await act(async () => {
      api().setProp("block:hero", "src", "/uploads/cover-b.jpg");
    });
    expect(host.textContent ?? "").not.toContain("Tu portada cambió");
  });

  it("21) Recalcular reads the NEW cover and goes straight to the proposals", async () => {
    vi.mocked(analyzeCoverImage).mockImplementation(async (src) =>
      src.includes("cover-b") ? OTHER_PROPOSALS : PROPOSALS,
    );
    const { host, api } = await mount(docWithDerivedPalette());
    await act(async () => {
      api().setProp("block:hero", "src", "/uploads/cover-b.jpg");
    });
    await click(button(host, "Recalcular"));

    expect(analyzeCoverImage).toHaveBeenCalledWith("/uploads/cover-b.jpg");
    // The owner's request was the confirmation: no second prompt.
    expect((host.textContent ?? "").includes("Encontramos una combinación")).toBe(false);
    expect(button(host, "Aplicar colores")).toBeTruthy();
    const vibrant = OTHER_PROPOSALS.find((item) => item.kind === "vibrant")!;
    await click(button(host, "Vibrante"));
    const shown = host.querySelector('[data-testid="cover-palette-preview"]') as HTMLElement;
    expect(shown.style.background).toBe(vibrant.tokens.bg);
  });

  it("22) Mantener colores actuales leaves the document byte-for-byte identical", async () => {
    const { host, page, api } = await mount(docWithDerivedPalette());
    await act(async () => {
      api().setProp("block:hero", "src", "/uploads/cover-b.jpg");
    });
    // Snapshot *after* the hero change: dismissing must add nothing on top of it.
    const afterHeroChange = structuredClone(page());
    await click(button(host, "Mantener colores actuales"));
    expect(page()).toEqual(afterHeroChange);
    expect(analyzeCoverImage).not.toHaveBeenCalled();
    expect(host.textContent ?? "").not.toContain("Tu portada cambió");
  });
});

/* ------------------------------------------------------------------ */
/* M4 — restaurar con el historial que ya existe                       */
/* ------------------------------------------------------------------ */

describe("CoverPalettePanel — restoring (M4)", () => {
  it("23) Restaurar undoes the apply through the existing history", async () => {
    const { host, page, api } = await mount(docWithBrandColors());
    const before = structuredClone(page());
    await analyze(host);
    await click(button(host, "Probar paleta"));
    await click(button(host, "Aplicar colores"));
    expect(page()).not.toEqual(before);
    expect(button(host, "Restaurar colores anteriores")).toBeTruthy();

    await click(button(host, "Restaurar colores anteriores"));
    expect(page()).toEqual(before);
    // One entry, consumed: the history is back where it started.
    expect(api().canUndo).toBe(false);
    expect(api().canRedo).toBe(true);
    expect(maybeButton(host, "Restaurar colores anteriores")).toBeUndefined();
  });

  it("24) Restaurar is withdrawn as soon as any other edit lands on top", async () => {
    // Otherwise one undo would revert that other edit instead of the palette.
    const { host, api } = await mount(docWithBrandColors());
    await analyze(host);
    await click(button(host, "Probar paleta"));
    await click(button(host, "Aplicar colores"));
    expect(button(host, "Restaurar colores anteriores")).toBeTruthy();

    await act(async () => {
      api().setText("hero.title", "Cocina Aurora 2");
    });
    expect(maybeButton(host, "Restaurar colores anteriores")).toBeUndefined();
  });

  it("25) Restaurar is withdrawn when the colours are edited by hand", async () => {
    const { host, api } = await mount(docWithBrandColors());
    await analyze(host);
    await click(button(host, "Probar paleta"));
    await click(button(host, "Aplicar colores"));

    await act(async () => {
      api().setProp("page", "accent", "#123456");
    });
    expect(maybeButton(host, "Restaurar colores anteriores")).toBeUndefined();
  });
});

/* ----------------------------------------------------------------- */
/* Premium gate — the plan, and only the plan, decides who can APPLY  */
/* ----------------------------------------------------------------- */

/**
 * Every colour a subtree actually paints, normalised to `rgb(r, g, b)`.
 *
 * The DOM hands back whatever form the CSSOM chose, so both the rendered chips
 * and the expected tokens go through here before they are compared — otherwise
 * the test would be measuring happy-dom's serialisation instead of the panel.
 */
function normaliseColour(value: string): string {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    const n = Number.parseInt(raw, 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  }
  const rgb = value.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return `rgb(${+rgb[1]}, ${+rgb[2]}, ${+rgb[3]})`;
  return value.trim().toLowerCase();
}

/** The colours a subtree paints inline — the teaser's chips, and nothing else. */
function inlineColours(scope: Element): string[] {
  return Array.from(scope.querySelectorAll("[style]"))
    .flatMap((element) => {
      const style = element.getAttribute("style") ?? "";
      return [
        ...(style.match(/rgb\([^)]*\)/g) ?? []),
        ...(style.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []),
      ];
    })
    .map(normaliseColour);
}

describe("CoverPalettePanel — Premium gate", () => {
  it("26) Free: the control is visible and nothing is written before it is pressed", async () => {
    const { host, page, api } = await mount(docWithoutColors(), { isPro: false });
    const before = structuredClone(page());
    expect(button(host, "Combinar colores con mi portada")).toBeTruthy();
    // No badge yet: Free can press this one. The badge marks what it cannot do,
    // and that only exists once there is a result to lock.
    expect(host.querySelector('[data-testid="cover-palette-pro-badge"]')).toBeNull();
    expect(host.querySelector('[data-testid="cover-palette-teaser"]')).toBeNull();
    expect(page()).toEqual(before);
    expect(api().canUndo).toBe(false);
  });

  it("27) Free: pressing it DOES analyse — the teaser is the point — and still writes nothing", async () => {
    const { host, page, api } = await mount(docWithoutColors(), { isPro: false });
    const before = structuredClone(page());
    await click(button(host, "Combinar colores con mi portada"));

    // The analysis is local: canvas, no API, no quota. Free is allowed to reach it.
    expect(analyzeCoverImage).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[data-testid="cover-palette-teaser"]')).toBeTruthy();
    expect(host.textContent ?? "").toContain("Encontramos una combinación para tu portada.");

    // …but the result is not the document's. Nothing was written and no undo
    // entry was created, which is the whole difference between Free and Pro.
    expect(page()).toEqual(before);
    expect(api().canUndo).toBe(false);
    expect(host.querySelector('[data-testid="cover-palette-preview"]')).toBeNull();
    expect(maybeButton(host, "Aplicar colores")).toBeUndefined();
  });

  it("28) Free is not handed the palette: the teaser paints three tones, never the seven tokens", async () => {
    const { host } = await mount(docWithoutColors(), { isPro: false });
    await click(button(host, "Combinar colores con mi portada"));
    const teaser = host.querySelector('[data-testid="cover-palette-teaser"]')!;

    // `swatches` is five of the seven final token values and the preview renders
    // all seven in their real roles, so the teaser shows a partial strip instead.
    const swatches = PROPOSALS[0].swatches;
    const allowed = [swatches[0], swatches[2], swatches[4]].map(normaliseColour);
    expect(inlineColours(teaser)).toEqual(allowed);

    // The four tokens the strip does not carry must not reach the DOM by any
    // other route — that is what makes the teaser a teaser and not the feature.
    const tokens = PROPOSALS[0].tokens;
    [tokens.surfaceColor, tokens.mutedColor, tokens.lineColor, tokens.accentFg]
      .map(normaliseColour)
      .filter((colour) => !allowed.includes(colour))
      .forEach((colour) => expect(inlineColours(teaser)).not.toContain(colour));

    // No per-mode swatches either: the three modes are named, not shown.
    expect(teaser.querySelectorAll("li")).toHaveLength(3);
  });

  it("29) Premium: no teaser, no badge, and the full flow renders — the gate is not global", async () => {
    const { host } = await mount(docWithoutColors(), { isPro: true });
    expect(host.querySelector('[data-testid="cover-palette-pro-badge"]')).toBeNull();
    expect(host.querySelector('[data-testid="cover-palette-teaser"]')).toBeNull();
    await analyze(host);
    expect(analyzeCoverImage).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[data-testid="cover-palette-preview"]')).toBeTruthy();
    expect(button(host, "Aplicar colores")).toBeTruthy();
  });

  it("30) a failed lookup still analyses, and still cannot apply", async () => {
    const { host, page, api } = await mount(docWithoutColors(), "error");
    const before = structuredClone(page());
    await click(button(host, "Combinar colores con mi portada"));
    expect(analyzeCoverImage).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[data-testid="cover-palette-teaser"]')).toBeTruthy();
    await click(button(host, "Usar combinación con Cripqer Pro"));
    expect(toastMock).toHaveBeenCalledWith(COVER_PALETTE_PREMIUM_NOTICE.headline, {
      description: COVER_PALETTE_PREMIUM_NOTICE.description,
    });
    expect(page()).toEqual(before);
    expect(api().canUndo).toBe(false);
  });

  it("31) while the lookup is pending the owner is Free — analysis yes, mutation no", async () => {
    const { host, page, api } = await mount(docWithoutColors(), "pending");
    const before = structuredClone(page());
    await click(button(host, "Combinar colores con mi portada"));
    expect(analyzeCoverImage).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[data-testid="cover-palette-teaser"]')).toBeTruthy();
    // No window: the teaser is reachable before the plan resolves, but applying
    // is not, because applying is what the plan decides.
    expect(maybeButton(host, "Aplicar colores")).toBeUndefined();
    expect(page()).toEqual(before);
    expect(api().canUndo).toBe(false);
  });

  it("32) Recalcular re-analyses for both, and only Premium reaches the proposals", async () => {
    vi.mocked(analyzeCoverImage).mockImplementation(async (src) =>
      src.includes("cover-b") ? OTHER_PROPOSALS : PROPOSALS,
    );

    const free = await mount(docWithDerivedPalette(), { isPro: false });
    await act(async () => {
      free.api().setProp("block:hero", "src", "/uploads/cover-b.jpg");
    });
    // The notice itself is not gated: the owner still sees why it appeared.
    expect(free.host.textContent ?? "").toContain("Tu portada cambió");
    expect(badged(button(free.host, "Mantener colores actuales"))).toBe(false);

    const freeBefore = structuredClone(free.page());
    await click(button(free.host, "Recalcular"));
    expect(analyzeCoverImage).toHaveBeenCalledWith("/uploads/cover-b.jpg");
    expect(free.host.querySelector('[data-testid="cover-palette-teaser"]')).toBeTruthy();
    expect(free.page()).toEqual(freeBefore);

    vi.mocked(analyzeCoverImage).mockClear();
    const pro = await mount(docWithDerivedPalette(), { isPro: true });
    await act(async () => {
      pro.api().setProp("block:hero", "src", "/uploads/cover-b.jpg");
    });
    await click(button(pro.host, "Recalcular"));
    expect(analyzeCoverImage).toHaveBeenCalledWith("/uploads/cover-b.jpg");
    expect(pro.host.querySelector('[data-testid="cover-palette-teaser"]')).toBeNull();
  });

  it("33) Free is offered the three modes, each locked, and no way to apply", async () => {
    const { host, api } = await mount(docWithoutColors(), { isPro: false });
    await click(button(host, "Combinar colores con mi portada"));
    const teaser = host.querySelector('[data-testid="cover-palette-teaser"]')!;
    const rows = Array.from(teaser.querySelectorAll("li"));

    ["Natural", "Elegante", "Vibrante"].forEach((label) => {
      const row = rows.find((element) => (element.textContent ?? "").includes(label));
      expect(row, `${label} is missing from the teaser`).toBeTruthy();
      expect(
        row!.querySelector('[data-testid="cover-palette-pro-badge"]'),
        `${label} is not marked Pro`,
      ).toBeTruthy();
    });

    // The mutation is not merely hidden behind a disabled button — there is no
    // control that reaches it, and the document confirms nothing happened.
    expect(maybeButton(host, "Aplicar colores")).toBeUndefined();
    expect(maybeButton(host, "Probar paleta")).toBeUndefined();
    expect(api().canUndo).toBe(false);
  });

  it("34) a palette already applied survives Free, token for token", async () => {
    const { host, page } = await mount(docWithDerivedPalette(), { isPro: false });
    const before = structuredClone(page());
    await click(button(host, "Combinar colores con mi portada"));
    expect(page()).toEqual(before);
    (
      [
        "bg",
        "textColor",
        "mutedColor",
        "surfaceColor",
        "lineColor",
        "accent",
        "accentFg",
        COVER_PALETTE_SOURCE_KEY,
        COVER_PALETTE_MODE_KEY,
        COVER_PALETTE_IMAGE_SRC_KEY,
      ] as const
    ).forEach((key) => {
      // Locking a capability blocks the mutation; it never removes what the
      // document already holds.
      expect(page()[key], `${key} was disturbed`).toBe(before[key]);
      expect(page()[key], `${key} was emptied`).not.toBe("");
    });
  });

  it("35) Restaurar answers to the document history, never to the plan", async () => {
    // Free: this panel applied nothing, so it owns no history entry to undo —
    // the absence is the history talking, not the plan.
    const free = await mount(docWithBrandColors(), { isPro: false });
    expect(maybeButton(free.host, "Restaurar colores anteriores")).toBeUndefined();

    // Premium: the panel's own apply is the top entry, so the offer appears.
    const pro = await mount(docWithBrandColors(), { isPro: true });
    await analyze(pro.host);
    await click(button(pro.host, "Probar paleta"));
    await click(button(pro.host, "Aplicar colores"));
    expect(button(pro.host, "Restaurar colores anteriores")).toBeTruthy();
  });

  it("36) a plan that resolves late turns the teaser into the full flow — and not before", async () => {
    const plan = deferredPlan();
    const { host, page, api } = await mount(docWithoutColors(), plan.promise);
    const before = structuredClone(page());

    // Slow boundary: Free's ceiling applies, so looking is reachable…
    await click(button(host, "Combinar colores con mi portada"));
    expect(host.querySelector('[data-testid="cover-palette-teaser"]')).toBeTruthy();
    expect(maybeButton(host, "Aplicar colores")).toBeUndefined();
    expect(page()).toEqual(before);
    expect(api().canUndo).toBe(false);

    // …and the moment the answer lands, the SAME analysis becomes applicable.
    // No second pass over the cover and no extra state: the branch is derived
    // from `isPremium`, so a slow Pro is never left stuck behind the teaser.
    await act(async () => {
      plan.settle({ isPro: true });
      await Promise.resolve();
    });
    expect(host.querySelector('[data-testid="cover-palette-teaser"]')).toBeNull();
    expect(analyzeCoverImage).toHaveBeenCalledTimes(1);

    await click(button(host, "Aplicar colores"));
    expect(page().accent).toBe(PROPOSALS[0].tokens.accent);
    expect(api().canUndo).toBe(true);
  });
});
