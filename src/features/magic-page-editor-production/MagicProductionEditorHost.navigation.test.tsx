// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Page } from "../../types/database";
import { serializeMagicEditorState } from "./magic-document";
import { MagicProductionEditorHost } from "./MagicProductionEditorHost";
import { EditorProvider } from "../../isolated/magic-page-editor/contexts/EditorContext";
import { TopBar } from "../../isolated/magic-page-editor/components/editor/TopBar";
import { PLATFORM_HOME_HREF } from "../../components/platform/platform-navigation";

/**
 * P0 — the Magic Production Editor must never be a dead end.
 *
 * Production shipped the editor with only the mobile bottom bar, so on desktop
 * there was nothing to click back to the platform. This test pins the platform
 * navigation to the host so that regression cannot come back silently.
 *
 * The platform navbar itself is the shared, canonical component; only the two
 * router bindings it needs are stubbed, so the real navbar renders here.
 */

const mocks = vi.hoisted(() => ({ getOwnedPage: vi.fn() }));

vi.mock("../../lib/supabase/client", () => ({
  getBrowserSupabaseClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: "owner" } } } }) },
  }),
}));

vi.mock("../../services/magic-page.service", () => ({
  magicPageService: {
    getOwnedPage: mocks.getOwnedPage,
    saveDraft: vi.fn(),
    publish: vi.fn(),
  },
}));

vi.mock("../../isolated/magic-page-editor/MagicEditorApp", () => ({
  MagicEditorApp: () => <div data-magic-editor-app />,
}));

vi.mock("../../components/app-shell/MobilePlatformNav", () => ({
  default: () => <nav data-mobile-platform-nav />,
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useLocation: () => ({ pathname: "/pages/page-id/edit" }),
    Link: ({ to, children, ...rest }: { to: string; children?: ReactNode }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

function ownedMagicPage(): Page {
  return {
    id: "page-id",
    title: "Página QA",
    page_type: "landing",
    published_revision: 1,
    template_config: serializeMagicEditorState({
      templateId: "bio",
      doc: {
        blocks: [{ key: "hero", type: "hero" }],
        texts: {},
        textStyles: {},
        props: {},
        removed: {},
      },
    }),
  } as Page;
}

describe("Magic Production Editor platform navigation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    mocks.getOwnedPage.mockReset();
    mocks.getOwnedPage.mockResolvedValue(ownedMagicPage());
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function open(props: { catalog?: boolean } = {}) {
    await act(async () => {
      root.render(<MagicProductionEditorHost pageId="page-id" {...props} />);
    });
  }

  it("renders the platform navbar over the editor on desktop", async () => {
    await open();
    expect(container.querySelector('[data-magic-editor-app]')).not.toBeNull();
    expect(container.querySelector('header[data-platform-navbar="editor"]')).not.toBeNull();
  });

  it("offers one-click links to Inicio and Mi página", async () => {
    await open();
    const header = container.querySelector('header[data-platform-navbar="editor"]');
    expect(header?.querySelector('a[href="/profile"]')).not.toBeNull();
    expect(header?.querySelector('a[href="/page"]')).not.toBeNull();
  });

  it("keeps the brand clickable instead of decorative", async () => {
    await open();
    const brand = container.querySelector(
      'header[data-platform-navbar="editor"] a[aria-label="Cripqer"]',
    );
    expect(brand?.getAttribute("href")).toBe("/profile");
  });

  it("never mounts two platform navbars at once", async () => {
    await open();
    expect(container.querySelectorAll("[data-platform-navbar]")).toHaveLength(1);
    expect(container.querySelectorAll("[data-mobile-platform-nav]")).toHaveLength(1);
  });

  it("keeps the mobile bottom bar as the only mobile navigation", async () => {
    await open();
    const header = container.querySelector('header[data-platform-navbar="editor"]');
    // Hidden below `lg` so it cannot duplicate MobilePlatformNav on phones.
    expect(header?.className).toContain("hidden");
    expect(header?.className).toContain("lg:block");
  });

  it("leaves the catalog workspace full-screen, with no global nav", async () => {
    await open({ catalog: true });
    expect(container.querySelector("[data-platform-navbar]")).toBeNull();
    expect(container.querySelector("[data-mobile-platform-nav]")).toBeNull();
    expect(container.querySelector('[data-magic-editor-app]')).not.toBeNull();
  });
});

/**
 * The editor toolbar is the second place the surface could dead-end: the
 * platform bar above it is `lg`-only, so below `lg` this mark is the only brand
 * on screen. It has to be a real destination, not decoration.
 */
describe("Magic editor toolbar brand", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("links the Cripqer mark to Inicio instead of leaving it decorative", async () => {
    await act(async () => {
      root.render(
        <EditorProvider initialTemplate="bio">
          <TopBar />
        </EditorProvider>,
      );
    });

    const brand = container.querySelector<HTMLAnchorElement>('a[aria-label="Ir a Inicio"]');
    expect(brand).not.toBeNull();
    expect(brand?.getAttribute("href")).toBe(PLATFORM_HOME_HREF);
    expect(brand?.querySelector('span[role="img"]')).not.toBeNull();
  });

  it("keeps the toolbar's own controls alongside the brand link", async () => {
    await act(async () => {
      root.render(
        <EditorProvider initialTemplate="bio">
          <TopBar />
        </EditorProvider>,
      );
    });

    // Requirement: navigation must not cost the editor its tools.
    for (const label of ["Tipo de página", "Variante", "Deshacer", "Rehacer", "Publicar"]) {
      const control =
        container.querySelector(`[aria-label="${label}"]`) ??
        [...container.querySelectorAll("button")].find(
          (button) => (button.textContent ?? "").trim() === label,
        );
      expect(control, `${label} must still be rendered`).not.toBeNull();
    }
  });
});
