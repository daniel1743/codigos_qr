// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";
import { EditorProvider, useEditor } from "../contexts/EditorContext";
import { TemplateRenderer } from "../components/templates/TemplateRenderer";
import { heroVariants } from "../components/editor/controls/HeroVariantPicker";

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function SelectionProbe() {
  const { selection } = useEditor();
  return <output data-testid="selection">{selection?.id ?? ""}</output>;
}

function mount(variant: string, device: "desktop" | "mobile", template: "bio" | "business" = "bio") {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider
        initialTemplate={template}
        initialDevice={device}
        initialDocument={{
          templateId: template,
          doc: {
            blocks: [{ key: "hero", type: "hero" }],
            texts: {},
            textStyles: {},
            props: { "block:hero": { variant } },
            removed: {},
          },
        }}
      >
        <TemplateRenderer />
        <SelectionProbe />
      </EditorProvider>,
    );
  });
  return { host, root };
}

function clickElement(host: HTMLElement, predicate: (element: HTMLElement) => boolean) {
  const element = [...host.querySelectorAll<HTMLElement>("[data-cq]")].find(predicate);
  if (!element) return false;
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  return true;
}

describe("Hero child selection and hit-testing", () => {
  for (const device of ["desktop", "mobile"] as const) {
    it(`selects the title and media independently for all 30 variants on ${device}`, () => {
      for (const variant of heroVariants) {
        const { host, root } = mount(variant.value, device);
        expect(clickElement(host, (element) => element.textContent?.trim() === "Marina Solé"), variant.value).toBe(true);
        expect(host.querySelector("[data-testid=selection]")?.textContent, variant.value).toBe("hero.name");

        const hasVisibleMedia = clickElement(host, (element) => element.className.includes("pointer-events-auto") && element.querySelector('img[alt="Costa mediterránea al atardecer"]') !== null);
        if (hasVisibleMedia) {
          expect(host.querySelector("[data-testid=selection]")?.textContent, variant.value).toBe("block:hero:hero-image");
        }

        expect(clickElement(host, (element) => element.getAttribute("data-shape") !== null), variant.value).toBe(true);
        expect(host.querySelector("[data-testid=selection]")?.textContent, variant.value).toBe("avatar");

        expect(clickElement(host, (element) => element.textContent?.trim() === "Creadora · Viajes lentos · Barcelona"), variant.value).toBe(true);
        expect(host.querySelector("[data-testid=selection]")?.textContent, variant.value).toBe("hero.role");

        expect(clickElement(host, (element) => element.textContent?.trim() === "Comparto lugares, recetas y rutinas sencillas para vivir con más calma. Guías, colaboraciones y todo lo que hago, en un solo sitio."), variant.value).toBe(true);
        expect(host.querySelector("[data-testid=selection]")?.textContent, variant.value).toBe("hero.bio");

        act(() => root.unmount());
        host.remove();
      }
    }, 30000);
  }

  for (const device of ["desktop", "mobile"] as const) {
    it(`selects every visible Business hero child on ${device}`, () => {
      for (const variant of heroVariants) {
        const { host, root } = mount(variant.value, device, "business");
        expect(clickElement(host, (element) => element.textContent?.trim() === "Tu piel, en las mejores manos."), variant.value).toBe(true);
        expect(host.querySelector("[data-testid=selection]")?.textContent, variant.value).toBe("hero.title");
        expect(clickElement(host, (element) => element.textContent?.trim() === "Tratamientos faciales y corporales pensados para realzar tu piel con naturalidad, criterio médico y un trato cercano."), variant.value).toBe(true);
        expect(host.querySelector("[data-testid=selection]")?.textContent, variant.value).toBe("hero.text");
        expect(clickElement(host, (element) => element.getAttribute("data-shape") !== null), variant.value).toBe(true);
        expect(host.querySelector("[data-testid=selection]")?.textContent, variant.value).toBe("avatar");
        expect(clickElement(host, (element) => element.tagName === "A" && element.textContent?.includes("Reservar valoración") === true), variant.value).toBe(true);
        expect(host.querySelector("[data-testid=selection]")?.textContent, variant.value).toBe("hero.cta");
        expect(clickElement(host, (element) => element.tagName === "A" && element.textContent?.includes("Ver tratamientos") === true), variant.value).toBe(true);
        expect(host.querySelector("[data-testid=selection]")?.textContent, variant.value).toBe("hero.cta2");
        act(() => root.unmount());
        host.remove();
      }
    }, 30000);
  }

  it("keeps the Hero background selection separate from child selection", () => {
    const { host, root } = mount("fullBleed", "desktop");
    const hero = host.querySelector<HTMLElement>("[data-hero]");
    expect(hero).toBeTruthy();
    act(() => {
      hero!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(host.querySelector("[data-testid=selection]")?.textContent).toBe("block:hero");
    expect(clickElement(host, (element) => element.textContent?.trim() === "Marina Solé")).toBe(true);
    expect(host.querySelector("[data-testid=selection]")?.textContent).toBe("hero.name");
    act(() => root.unmount());
    host.remove();
  });
});
