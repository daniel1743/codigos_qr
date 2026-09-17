// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { PremiumOnboardingFlow } from "../premium/PremiumOnboardingFlow";
import { sanitizeGenerationError } from "../premium/generation-error";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function renderFlow(): HTMLDivElement {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root?.render(<PremiumOnboardingFlow />);
  });
  return container;
}

function buttonByText(label: string): HTMLButtonElement {
  const button = Array.from(container?.querySelectorAll("button") ?? []).find((candidate) =>
    candidate.textContent?.includes(label),
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Button not found: ${label}`);
  return button;
}

function click(label: string): void {
  act(() => buttonByText(label).click());
}

function setInput(selector: string, value: string): void {
  const input = container?.querySelector(selector);
  if (!(input instanceof HTMLInputElement)) throw new Error(`Input not found: ${selector}`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  act(() => {
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("Premium onboarding UI integration", () => {
  it("renders the five approved steps and the truthful session note", () => {
    const view = renderFlow();

    expect(view.querySelector('[aria-label="Progreso del onboarding"]')).not.toBeNull();
    expect(view.textContent).toContain("Tu negocio");
    expect(view.textContent).toContain("Lo que buscas");
    expect(view.textContent).toContain("Tu contenido");
    expect(view.textContent).toContain("Contacto");
    expect(view.textContent).toContain("Imágenes");
    expect(view.textContent).toContain("Tu información queda en esta sesión");
    expect(view.textContent).not.toContain("Guardar para después");
  });

  it("shows validation feedback before advancing and supports back navigation", () => {
    const view = renderFlow();

    click("Continuar");
    expect(view.querySelector('[role="alert"]')?.textContent).toContain("nombre");

    setInput('input[placeholder="Ej. Estudio Norte"]', "Estudio Norte");
    setInput('input[placeholder="Ej. Fotografía de bodas"]', "Fotografía");
    click("Negocio local");
    click("Continuar");
    expect(view.textContent).toContain("¿Qué quieres conseguir con tu página?");

    click("Atrás");
    expect(view.textContent).toContain("Cuéntanos sobre tu negocio");
  });

  it("switches the content step to the selected real owner-content kind", () => {
    const view = renderFlow();

    setInput('input[placeholder="Ej. Estudio Norte"]', "Tienda Norte");
    setInput('input[placeholder="Ej. Fotografía de bodas"]', "Tienda");
    click("Tienda o productos");
    click("Continuar");
    click("Quiero mostrar mis productos");
    click("Continuar");

    expect(view.textContent).toContain("¿Qué productos quieres mostrar?");
    expect(view.textContent).not.toContain("¿Qué servicios ofreces?");
    click("Añadir producto");
    expect(view.querySelector('input[aria-label="Producto nombre"]')).not.toBeNull();
  });

  it("keeps the real product destination field visible even when it is empty", () => {
    const view = renderFlow();

    setInput('input[placeholder="Ej. Estudio Norte"]', "Tienda Norte");
    setInput('input[placeholder="Ej. Fotografía de bodas"]', "Tienda");
    click("Tienda o productos");
    click("Continuar");
    click("Quiero mostrar mis productos");
    click("Continuar");
    click("Añadir producto");

    expect(view.querySelector('input[aria-label="Producto enlace opcional"]')).not.toBeNull();
  });

  it("reaches the image step with an explicit safe omission option", () => {
    const view = renderFlow();

    setInput('input[placeholder="Ej. Estudio Norte"]', "Estudio Norte");
    setInput('input[placeholder="Ej. Fotografía de bodas"]', "Fotografía");
    click("Negocio local");
    click("Continuar");
    click("Quiero que me escriban");
    click("Continuar");
    click("Añadir servicio");
    setInput('input[aria-label="Servicio nombre"]', "Sesión inicial");
    click("Continuar");
    click("WhatsApp");
    setInput('input[placeholder="+56 9 1234 5678"]', "+56912345678");
    click("Continuar");

    expect(view.textContent).toContain("Tu negocio debe sentirse tuyo");
    expect(view.textContent).toContain("Puedes omitir las imágenes ahora");
    expect(view.textContent).toContain("No exportaremos `blob:`");
    expect(view.querySelector('input[type="file"]')).not.toBeNull();
  });

  it("sanitizes server HTML without hiding useful application errors", () => {
    expect(
      sanitizeGenerationError("<!doctype html><html><body>This page didn't load</body></html>"),
    ).toBe(
      "No pudimos crear tu página todavía. Tus datos siguen aquí. Revisa la información o inténtalo nuevamente.",
    );
    expect(sanitizeGenerationError(new Error("Missing owner fact: services[0].name."))).toBe(
      "Missing owner fact: services[0].name.",
    );
    expect(sanitizeGenerationError(new Error("Failed to fetch"))).toContain(
      "No pudimos crear tu página todavía",
    );
  });
});
