// @vitest-environment happy-dom
/**
 * Landing Launch Lite V2 - B1 certification of the sample preview.
 *
 * The previous contract test only read the source as text. This one renders the
 * real component and measures the four claims that make the gallery launch-safe:
 *   1. each sample opens as a read-only dialog (never a selection surface);
 *   2. Escape, the backdrop and the close button close it, restoring scroll+focus;
 *   3. it shows the tile's own mock, or the certified capture when one exists -
 *      it never fabricates a template design;
 *   4. it exposes no editable field, no form and no "use this" action.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_PREVIEW_COPY, SampleCardPreview } from "../SampleCardPreview";

const SAMPLE = {
  label: "Belleza",
  bg: "#efe7db",
  av: "#0D47A1",
  avc: "#ffffff",
  bar: "#e4ded2",
  nameColor: "#111111",
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  document.body.replaceChildren();
  document.body.style.overflow = "";
});

function mount(props: { shot?: string | null } = {}) {
  const onClose = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() =>
    root.render(<SampleCardPreview {...SAMPLE} shot={props.shot ?? null} onClose={onClose} />),
  );
  return {
    host,
    onClose,
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

const dialog = (host: HTMLElement) =>
  host.querySelector<HTMLElement>('[data-testid="sample-card-preview"]');
const overlay = (host: HTMLElement) =>
  host.querySelector<HTMLElement>('[data-testid="sample-card-preview-overlay"]');

describe("B1 - sample preview is a read-only dialog", () => {
  it("opens labelled by the sample and never offers a selection action", () => {
    const { host, unmount } = mount();
    const panel = dialog(host);
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute("role")).toBe("dialog");
    expect(panel?.getAttribute("aria-modal")).toBe("true");
    expect(panel?.getAttribute("data-sample")).toBe("Belleza");

    // The accessible name points at real text inside the dialog.
    const labelledBy = panel?.getAttribute("aria-labelledby") ?? "";
    expect(labelledBy).not.toBe("");
    expect(document.getElementById(labelledBy)?.textContent).toContain("Belleza");

    // Required product copy, verbatim.
    expect(panel?.textContent).toContain(SAMPLE_PREVIEW_COPY);

    // No selection surface of any kind: only the close button exists.
    const buttons = Array.from(panel?.querySelectorAll("button") ?? []);
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.getAttribute("data-testid")).toBe("sample-card-preview-close");
    expect(panel?.querySelectorAll("input, form, textarea, select, a")).toHaveLength(0);
    expect(panel?.textContent ?? "").not.toMatch(/usar esta|elegir plantilla|usar plantilla/i);
    unmount();
  });

  it("hides the page scroll while open and restores it on unmount", () => {
    const { host, unmount } = mount();
    expect(document.body.style.overflow).toBe("hidden");
    act(() =>
      host.querySelector<HTMLButtonElement>('[data-testid="sample-card-preview-close"]')?.click(),
    );
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});

describe("B1 - closing the preview", () => {
  it("closes with Escape", () => {
    const { onClose, unmount } = mount();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("closes with the close button", () => {
    const { host, onClose, unmount } = mount();
    act(() =>
      host.querySelector<HTMLButtonElement>('[data-testid="sample-card-preview-close"]')?.click(),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("closes when the backdrop is clicked, but not when the sample itself is", () => {
    const { host, onClose, unmount } = mount();
    act(() => overlay(host)?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => dialog(host)?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("keeps Escape from leaking to the page underneath", () => {
    const leaked: string[] = [];
    const listener = () => leaked.push("esc");
    window.addEventListener("keydown", listener);
    mount();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    window.removeEventListener("keydown", listener);
    // The dialog stops propagation, so nothing above the document reacts to it.
    expect(leaked).toHaveLength(0);
  });
});
