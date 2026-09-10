// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { PremiumTemplateStudio } from "../components/PremiumTemplateStudio";
import { createDemoConfig } from "../templates/definitions";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderStudio() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<PremiumTemplateStudio config={createDemoConfig()} />);
  });
  return { container, root };
}

describe("Power Editor Preview mode (Vista previa)", () => {
  it("edit mode shows the mode toggle and no 'Volver a editar'", () => {
    const { container, root } = renderStudio();
    expect(container.textContent).toContain("Vista previa");
    expect(container.textContent).not.toContain("Volver a editar");
    // Edit mode keeps the left sidebar navigation tabs.
    expect(container.textContent).toContain("Bloques");
    act(() => root.unmount());
  });

  it("entering preview shows a distinct header and hides the editing side panels", () => {
    const { container, root } = renderStudio();
    const toggle = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Vista previa"),
    );
    expect(toggle).toBeTruthy();

    act(() => {
      toggle!.click();
    });

    // Distinct preview header with a clear return action.
    expect(container.textContent).toContain("Volver a editar");
    // Sidebar navigation and Inspector are hidden in preview.
    expect(container.textContent).not.toContain("Bloques");
    expect(container.textContent).not.toContain("Ajustes");

    act(() => root.unmount());
  });

  it("returning to edit restores the editing shell", () => {
    const { container, root } = renderStudio();
    const toggle = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Vista previa"),
    );
    act(() => {
      toggle!.click();
    });

    const back = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Volver a editar"),
    );
    expect(back).toBeTruthy();
    act(() => {
      back!.click();
    });

    expect(container.textContent).toContain("Bloques");
    expect(container.textContent).not.toContain("Volver a editar");

    act(() => root.unmount());
  });
});
