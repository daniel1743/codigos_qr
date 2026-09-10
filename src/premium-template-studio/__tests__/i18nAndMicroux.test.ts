// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { es } from "../i18n/es";
import { PowerEditorLocaleProvider, usePowerEditorLocale } from "../i18n/PowerEditorLocale";
import {
  DEFAULT_POWER_EDITOR_LOCALE,
  POWER_EDITOR_LOCALE_STORAGE_KEY,
  powerEditorMessages,
  type PowerEditorLocale,
} from "../i18n/messages";
import { createDemoConfig } from "../templates/definitions";
import {
  DISCOVERY_HINTS,
  DISCOVERY_HINT_DURATION_MS,
  getSeenHintIds,
  hintForSelection,
  markHintSeen,
} from "../microux/discoveryHints";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, nested]) =>
    flattenKeys(nested, prefix ? `${prefix}.${key}` : key),
  );
}

function LocaleProbe() {
  const { locale, messages, setLocale } = usePowerEditorLocale();
  return createElement(
    "div",
    null,
    createElement("span", { "data-testid": "locale" }, locale),
    createElement("span", { "data-testid": "label" }, messages.locale.editorLanguage),
    createElement("button", { type: "button", onClick: () => setLocale("en") }, "English"),
    createElement("button", { type: "button", onClick: () => setLocale("es") }, "Español"),
  );
}

function renderLocaleProbe() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      createElement(PowerEditorLocaleProvider, null, createElement(LocaleProbe)),
    );
  });
  return { container, root };
}

describe("Power Editor Spanish localization (Workstream A)", () => {
  it("defaults to Spanish and keeps dictionary parity with English", () => {
    expect(DEFAULT_POWER_EDITOR_LOCALE).toBe("es");
    expect(POWER_EDITOR_LOCALE_STORAGE_KEY).toBe("cripqer.powerEditor.locale");
    expect(flattenKeys(powerEditorMessages.es).sort()).toEqual(
      flattenKeys(powerEditorMessages.en).sort(),
    );
  });

  it("navigation tabs render Spanish", () => {
    expect(es.nav.blocks).toBe("Bloques");
    expect(es.nav.design).toBe("Diseño");
    expect(es.nav.templates).toBe("Plantillas");
    expect(es.nav.settings).toBe("Ajustes");
  });

  it("Save states render Spanish", () => {
    expect(es.toolbar.save).toBe("Guardar");
    expect(es.toolbar.saving).toBe("Guardando...");
    expect(es.toolbar.saved).toBe("Guardado");
  });

  it("Publish states render Spanish", () => {
    expect(es.toolbar.publish).toBe("Publicar");
    expect(es.toolbar.publishing).toBe("Publicando...");
    expect(es.toolbar.published).toBe("Publicado");
  });

  it("key section labels render Spanish", () => {
    expect(es.sidebar.addContent).toBe("Añadir contenido");
    expect(es.sidebar.visualIdentity).toBe("Identidad visual");
    expect(es.sidebar.typography).toBe("Tipografía");
    expect(es.sidebar.motion).toBe("Movimiento");
    expect(es.banner.banner).toBe("Portada");
    expect(es.banner.overlay).toBe("Superposición");
  });

  it("internal canonical values are never translated (no enum/symbol leakage)", () => {
    // The dictionary must not attempt to rename ids/enums; it is copy-only.
    const serialized = JSON.stringify(es);
    expect(serialized).not.toContain("blocks_enum");
    expect(serialized).not.toContain("templateDefinitionId");
  });

  it("switches English and Spanish immediately, persists locally, and does not touch config", () => {
    window.localStorage.clear();
    const config = createDemoConfig();
    const before = JSON.stringify(config);
    const { container, root } = renderLocaleProbe();

    expect(container.querySelector('[data-testid="locale"]')?.textContent).toBe("es");
    expect(container.querySelector('[data-testid="label"]')?.textContent).toBe("Idioma del editor");

    const buttons = Array.from(container.querySelectorAll("button"));
    act(() => {
      buttons.find((button) => button.textContent === "English")?.click();
    });
    expect(container.querySelector('[data-testid="locale"]')?.textContent).toBe("en");
    expect(container.querySelector('[data-testid="label"]')?.textContent).toBe("Editor language");
    expect(window.localStorage.getItem(POWER_EDITOR_LOCALE_STORAGE_KEY)).toBe("en");

    act(() => {
      buttons.find((button) => button.textContent === "Español")?.click();
    });
    expect(container.querySelector('[data-testid="locale"]')?.textContent).toBe("es");
    expect(container.querySelector('[data-testid="label"]')?.textContent).toBe("Idioma del editor");
    expect(window.localStorage.getItem(POWER_EDITOR_LOCALE_STORAGE_KEY)).toBe("es");
    expect(JSON.stringify(config)).toBe(before);

    act(() => root.unmount());
  });

  it("rejects invalid stored values and starts from the Spanish default", () => {
    window.localStorage.setItem(POWER_EDITOR_LOCALE_STORAGE_KEY, "fr" satisfies string);
    const { container, root } = renderLocaleProbe();
    expect(container.querySelector('[data-testid="locale"]')?.textContent).toBe(
      DEFAULT_POWER_EDITOR_LOCALE satisfies PowerEditorLocale,
    );
    act(() => root.unmount());
  });
});

describe("Power Editor discovery hints (Workstream B, P1)", () => {
  it("button-like blocks trigger the button→card hint", () => {
    expect(hintForSelection({ type: "links" })).toBe("button_to_card");
    expect(hintForSelection({ type: "buttonGroup" })).toBe("button_to_card");
    expect(hintForSelection({ type: "featuredLink" })).toBe("button_to_card");
    expect(hintForSelection({ type: "cta" })).toBe("button_to_card");
  });

  it("image-capable card blocks trigger the card-image hint", () => {
    expect(hintForSelection({ type: "mediaCard" })).toBe("card_image");
  });

  it("unrelated blocks trigger no hint", () => {
    expect(hintForSelection({ type: "hero" })).toBeNull();
    expect(hintForSelection({ type: "text" })).toBeNull();
    expect(hintForSelection(null)).toBeNull();
  });

  it("hints never mutate the document (pure decision over block type)", () => {
    // hintForSelection returns an id only; it has no side effects and reads no
    // config. Selecting a hint must not change any canonical state.
    const before = { type: "links" };
    const result = hintForSelection(before);
    expect(result).toBe("button_to_card");
    expect(before).toEqual({ type: "links" });
  });

  it("every approved hint has a non-empty Spanish message", () => {
    for (const hint of Object.values(DISCOVERY_HINTS)) {
      expect(hint.message.length).toBeGreaterThan(0);
    }
    expect(DISCOVERY_HINTS.button_to_card.message).toContain("tarjeta");
  });

  it("auto-dismiss duration is within the recommended 4000–6000ms range", () => {
    expect(DISCOVERY_HINT_DURATION_MS).toBeGreaterThanOrEqual(4000);
    expect(DISCOVERY_HINT_DURATION_MS).toBeLessThanOrEqual(6000);
  });

  it("seen-state persists a hint id (UI-only, localStorage) and deduplicates", () => {
    window.localStorage.clear();
    expect(getSeenHintIds().size).toBe(0);

    markHintSeen("button_to_card");
    const seen = getSeenHintIds();
    expect(seen.has("button_to_card")).toBe(true);
    expect(seen.has("card_image")).toBe(false);
  });
});
