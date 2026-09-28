// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, beforeEach } from "vitest";
import { EditorProvider } from "../contexts/EditorContext";
import { TopBar } from "../components/editor/TopBar";
import { miniGalleryVariants, pageFamilyVariants } from "../data/templates";
import {
  hydrateMagicEditorState,
  serializeMagicEditorState,
  type MagicEditorStateV1,
} from "../../../features/magic-page-editor-production/magic-document";

const topBarCss = readFileSync("src/isolated/magic-page-editor/styles/magic-editor.css", "utf8");

const FAMILY_TRIGGER = 'button[aria-label="Tipo de página"]';
const VARIANT_TRIGGER = 'button[aria-label="Variante"]';
const FAMILY_MENU = 'div[role="dialog"][aria-label="Tipos de página"]';
const variantMenu = (family: string) => `div[role="dialog"][aria-label="Variantes ${family}"]`;

/** The page families and variant counts the reference confirms. */
const CONFIRMED_FAMILIES = [
  { label: "Bio", variants: 8 },
  { label: "Negocio / Servicios", variants: 8 },
  { label: "Portafolio", variants: 8 },
  { label: "Mini Galería", variants: 5 },
] as const;

let hosts: HTMLDivElement[] = [];

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  if (typeof window.matchMedia !== "function") {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  }
});

afterEach(() => {
  hosts = hosts.filter((host) => {
    host.remove();
    return false;
  });
});

/** Latest document state the editor reported, as the production host receives it. */
let lastState: MagicEditorStateV1 | null = null;

/** Mounts the shared Magic-facing top bar on top of the real editor document state. */
function mountTopBar(initialDocument?: MagicEditorStateV1) {
  const host = document.createElement("div");
  document.body.append(host);
  hosts.push(host);
  const root: Root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider
        initialTemplate="bio"
        {...(initialDocument ? { initialDocument } : {})}
        onDocumentChange={(state) => {
          lastState = state;
        }}
      >
        <TopBar />
      </EditorProvider>,
    );
  });
  return host;
}

function query<T extends Element>(host: HTMLElement, selector: string): T | null {
  return host.querySelector<T>(selector);
}

function click(target: Element | null, label: string) {
  if (!target) throw new Error(`${label} was not rendered, so it cannot be clicked`);
  act(() => {
    (target as HTMLElement).click();
  });
}

function buttonByText(scope: Element | null, text: string): HTMLButtonElement {
  if (!scope) throw new Error("The menu that should contain the button is not mounted");
  const found = [...scope.querySelectorAll("button")].find(
    (button) => (button.textContent ?? "").trim() === text,
  );
  if (!found) throw new Error(`No button labelled "${text}" was rendered`);
  return found as HTMLButtonElement;
}

function optionLabels(scope: Element | null): string[] {
  if (!scope) return [];
  return [...scope.querySelectorAll("button")].map((button) =>
    (button.textContent ?? "").trim(),
  );
}

describe("Magic top bar · Tipo de página", () => {
  it("opens the page-family menu on click", () => {
    const host = mountTopBar();
    expect(query(host, FAMILY_MENU)).toBeNull();

    click(query(host, FAMILY_TRIGGER), "the page-family trigger");

    const menu = query(host, FAMILY_MENU);
    expect(menu, "the page-family menu did not mount").not.toBeNull();
    expect(optionLabels(menu)).toHaveLength(5);
  });

  it("lists the confirmed families in reference order", () => {
    const host = mountTopBar();
    click(query(host, FAMILY_TRIGGER), "the page-family trigger");

    expect(optionLabels(query(host, FAMILY_MENU))).toEqual([
      "Bio",
      "Negocio / Servicios",
      "Catálogo",
      "Portafolio",
      "Mini Galería",
    ]);
  });
});

describe("Magic top bar · Variante", () => {
  it("opens the variant menu of the current family on click", () => {
    const host = mountTopBar();
    expect(query(host, variantMenu("Bio"))).toBeNull();

    click(query(host, VARIANT_TRIGGER), "the variant trigger");

    const menu = query(host, variantMenu("Bio"));
    expect(menu, "the variant menu did not mount").not.toBeNull();
    expect(optionLabels(menu)).toHaveLength(CONFIRMED_FAMILIES[0].variants);
  });

  it("shows the confirmed variant count for every family", () => {
    for (const family of CONFIRMED_FAMILIES) {
      const host = mountTopBar();
      click(query(host, FAMILY_TRIGGER), "the page-family trigger");
      click(buttonByText(query(host, FAMILY_MENU), family.label), family.label);

      const menu = query(host, variantMenu(family.label));
      expect(menu, `${family.label} did not open its variant menu`).not.toBeNull();

      const labels = optionLabels(menu);
      expect(labels, `${family.label} variant count`).toHaveLength(family.variants);
      expect(new Set(labels).size, `${family.label} repeats a variant label`).toBe(labels.length);
    }
  });

  it("keeps the variant store aligned with the confirmed counts", () => {
    expect(pageFamilyVariants.bio).toHaveLength(8);
    expect(pageFamilyVariants.business).toHaveLength(8);
    expect(pageFamilyVariants.portfolio).toHaveLength(8);
    expect(miniGalleryVariants).toHaveLength(5);
  });
});

describe("Magic top bar · selection contract", () => {
  it("writes the chosen family and variant into the document", () => {
    lastState = null;
    const host = mountTopBar();

    click(query(host, FAMILY_TRIGGER), "the page-family trigger");
    click(buttonByText(query(host, FAMILY_MENU), "Portafolio"), "Portafolio");
    click(buttonByText(query(host, variantMenu("Portafolio")), "Nocturno"), "Nocturno");

    expect(lastState?.templateId).toBe("portfolio");
    expect(lastState?.doc.props["page"]?.["familyVariant"]).toBe("nocturne");
    expect(query(host, VARIANT_TRIGGER)?.textContent).toContain("Nocturno");
    expect(query(host, FAMILY_TRIGGER)?.textContent).toContain("Portafolio");
  });

  it("survives a save/reload round trip", () => {
    lastState = null;
    const host = mountTopBar();
    click(query(host, FAMILY_TRIGGER), "the page-family trigger");
    click(buttonByText(query(host, FAMILY_MENU), "Negocio / Servicios"), "Negocio / Servicios");
    click(buttonByText(query(host, variantMenu("Negocio / Servicios")), "Concierge"), "Concierge");

    const saved = serializeMagicEditorState(lastState!);
    const reloaded = hydrateMagicEditorState(saved);

    expect(reloaded.templateId).toBe("business");
    expect(reloaded.doc.props["page"]?.["familyVariant"]).toBe("concierge");

    // A reopened editor shows the persisted choice instead of resetting it.
    const reopened = mountTopBar(reloaded);
    expect(query(reopened, FAMILY_TRIGGER)?.textContent).toContain("Negocio / Servicios");
    expect(query(reopened, VARIANT_TRIGGER)?.textContent).toContain("Concierge");
  });
});

describe("Magic top bar · popover clipping guard", () => {
  it("never lets the top bar become a scroll container that clips the dropdowns", () => {
    const headerRule = /\.magic-editor-root header\s*\{[^}]*\}/.exec(topBarCss)?.[0] ?? "";
    expect(headerRule, "the .magic-editor-root header rule disappeared").not.toBe("");

    // `overflow-x: hidden` forces `overflow-y` to compute to `auto`: the header
    // becomes a scroll container and the absolutely positioned menus, which open
    // below the bar, are clipped away inside its height.
    expect(
      headerRule,
      "the top bar must not use `hidden` on one axis, it clips the page-family and variant menus",
    ).not.toMatch(/overflow(-x|-y)?\s*:\s*hidden/);
    expect(headerRule).toMatch(/overflow-x:\s*clip/);
  });
});
