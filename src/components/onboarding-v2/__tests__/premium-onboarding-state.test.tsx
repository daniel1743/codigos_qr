// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { generateMock, persistMock } = vi.hoisted(() => ({
  generateMock: vi.fn(),
  persistMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabaseClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-session-token" } },
      }),
    },
  }),
}));

vi.mock("@/lib/onboarding-v2", () => ({
  generateSmartPageFromOnboardingFn: generateMock,
  persistPremiumOnboardingGeneratedPageFn: persistMock,
}));

import { PremiumOnboardingFlow } from "../premium/PremiumOnboardingFlow";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function buttonByText(label: string): HTMLButtonElement {
  const button = Array.from(container?.querySelectorAll("button") ?? []).find((candidate) =>
    candidate.textContent?.includes(label),
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Button not found: ${label}`);
  return button;
}

function setInput(selector: string, value: string): void {
  const input = container?.querySelector(selector);
  if (!(input instanceof HTMLInputElement)) throw new Error(`Input not found: ${selector}`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  act(() => input.dispatchEvent(new Event("input", { bubbles: true })));
}

async function click(label: string): Promise<void> {
  await act(async () => {
    buttonByText(label).click();
  });
}

async function completeToImages(): Promise<void> {
  setInput('input[placeholder="Ej. Estudio Norte"]', "Estudio Demo");
  setInput('input[placeholder="Ej. Fotografía de bodas"]', "Fotografía");
  await click("Negocio local");
  await click("Continuar");
  await click("Quiero que me escriban");
  await click("Continuar");
  await click("Añadir servicio");
  setInput('input[aria-label="Servicio nombre"]', "Sesión inicial");
  await click("Continuar");
  await click("WhatsApp");
  setInput('input[placeholder="+56 9 1234 5678"]', "+56912345678");
  await click("Continuar");
  await click("Sencilla");
}

const generated = {
  ok: true as const,
  request: {} as never,
  plan: { title: "Estudio Demo", experienceType: "services" as const },
  mapping: {} as never,
  result: {
    editorConfig: {} as never,
    generation: { candidateId: "candidate", score: 90, family: "minimal", layout: "compact" },
  },
  diagnostics: {
    mappedFields: [],
    deferredFields: [],
    unsupportedFields: [],
    missingOwnerFacts: [],
    warnings: [],
  },
};

describe("Premium onboarding persistence state machine", () => {
  beforeEach(() => {
    generateMock.mockReset().mockResolvedValue(generated);
    persistMock.mockReset().mockReturnValue(new Promise(() => undefined));
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root?.render(<PremiumOnboardingFlow profileId="11111111-1111-4111-8111-111111111111" />);
    });
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it("moves from GENERATING to PERSISTING and prevents a double submit", async () => {
    await completeToImages();
    const createButton = buttonByText("Crear mi primera versión");

    await act(async () => {
      createButton.click();
      createButton.click();
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    });

    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(persistMock).toHaveBeenCalledTimes(1);
    expect(container?.textContent).toContain("Estamos guardando tu página");
    expect(container?.textContent).not.toContain("Tu página está lista");
  });

  it("does not emit the QA inspector before hydration", () => {
    const html = renderToString(
      <PremiumOnboardingFlow enableInspector profileId="11111111-1111-4111-8111-111111111111" />,
    );

    expect(html).toContain("premium-onboarding__shell");
    expect(html).not.toContain("gi-floating-btn");
  });
});
