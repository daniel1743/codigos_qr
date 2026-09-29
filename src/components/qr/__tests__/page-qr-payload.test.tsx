// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
import { describe, expect, it, vi } from "vitest";
import { PageQrPanel } from "../PageQrPanel";
import { getPublicPageUrl, getPublicQrUrl } from "../../../lib/url";
import type { Page } from "../../../types/database";

/**
 * The canvas renderer is not needed for this proof and would require a 2D
 * context implementation; we replace it with a probe that exposes the exact
 * `value` the panel hands to the real QR engine.
 */
vi.mock("qrcode.react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("qrcode.react")>();
  return {
    ...actual,
    QRCodeCanvas: ({ value }: { value: string }) => (
      <span data-qr-canvas-value={value} data-testid="qr-canvas-probe" />
    ),
  };
});

const PAGE = {
  id: "11111111-1111-4111-8111-111111111111",
  owner_user_id: "user-1",
  profile_id: "profile-1",
  public_id: "yfLEdka",
  title: "Promo septiembre",
  page_type: "promotion",
  published: true,
  published_revision: 3,
  qr_config: {},
} as unknown as Page;

function mount(node: React.ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(node);
  });
  return { host, root };
}

/** QR module geometry is a deterministic function of the encoded value. */
function modulesOf(host: HTMLElement, selector: string): string {
  const svg = host.querySelector(selector);
  if (!svg) throw new Error(`QR SVG not found for ${selector}`);
  return svg.innerHTML.replace(/\s+/g, " ").trim();
}

describe("F4 — page QR encodes the canonical /q/{public_id} boundary", () => {
  it("hands the /q/ URL (never /pg/) to the real QR engine", () => {
    const { host } = mount(<PageQrPanel page={PAGE} userId="user-1" />);
    const probe = host.querySelector("[data-qr-canvas-value]");
    expect(probe?.getAttribute("data-qr-canvas-value")).toBe(getPublicQrUrl("yfLEdka"));
    expect(probe?.getAttribute("data-qr-canvas-value")).toBe("https://www.cripqer.dev/q/yfLEdka");
    expect(probe?.getAttribute("data-qr-canvas-value")).not.toContain("/pg/");
  });

  it("renders the same module matrix as a QR built from /q/{public_id}", () => {
    const { host: panelHost } = mount(<PageQrPanel page={PAGE} userId="user-1" />);
    const fromPanel = modulesOf(panelHost, "#page-qr-code-svg");

    const { host: expectedHost } = mount(
      <QRCodeSVG
        id="qr-reference-expected"
        value={getPublicQrUrl("yfLEdka")}
        size={256}
        fgColor="#000000"
        bgColor="#ffffff"
      />,
    );
    const expected = modulesOf(expectedHost, "#qr-reference-expected");

    const { host: legacyHost } = mount(
      <QRCodeSVG
        id="qr-reference-direct-pg"
        value={getPublicPageUrl("yfLEdka")}
        size={256}
        fgColor="#000000"
        bgColor="#ffffff"
      />,
    );
    const legacyDirect = modulesOf(legacyHost, "#qr-reference-direct-pg");

    expect(fromPanel.length).toBeGreaterThan(200);
    expect(fromPanel).toBe(expected);
    expect(fromPanel).not.toBe(legacyDirect);
  });

  it("shows the canonical QR URL and the final destination as separate concepts", () => {
    const { host } = mount(<PageQrPanel page={PAGE} userId="user-1" />);
    const qrUrlNode = host.querySelector("[data-qr-url]");
    const destinationNode = host.querySelector("[data-qr-destination]");

    expect(qrUrlNode?.getAttribute("data-qr-url")).toBe("https://www.cripqer.dev/q/yfLEdka");
    expect(qrUrlNode?.textContent ?? "").not.toContain("/pg/");
    expect(destinationNode?.getAttribute("data-qr-destination")).toBe(
      "https://www.cripqer.dev/pg/yfLEdka",
    );
  });
});
