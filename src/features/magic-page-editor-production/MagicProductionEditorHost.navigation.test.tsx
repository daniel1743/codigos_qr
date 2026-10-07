// @vitest-environment happy-dom
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

  it("renders exactly one platform navbar header over the editor on desktop", async () => {
    await open();
    expect(container.querySelector('[data-magic-editor-app]')).not.toBeNull();
    expect(container.querySelectorAll('header[data-platform-navbar="editor"]')).toHaveLength(1);
    expect(container.querySelectorAll("header[data-platform-navbar]")).toHaveLength(1);
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

  async function renderTopBar(platformHomeHref?: string) {
    await act(async () => {
      root.render(
        <EditorProvider initialTemplate="bio">
          <TopBar {...(platformHomeHref ? { platformHomeHref } : {})} />
        </EditorProvider>,
      );
    });
  }

  it("sends the brand mark to the destination the host supplied", async () => {
    // Deliberately not `/profile`: the href has to come from the prop, so a
    // literal buried in the editor cannot satisfy this.
    await renderTopBar("/destino-del-host");

    const brand = container.querySelector<HTMLAnchorElement>('a[aria-label="Ir a Inicio"]');
    expect(brand).not.toBeNull();
    expect(brand?.getAttribute("href")).toBe("/destino-del-host");
    expect(brand?.querySelector('span[role="img"]')).not.toBeNull();
  });

  it("steps aside from `lg` up, leaving the platform bar as the only brand", async () => {
    await renderTopBar("/destino-del-host");
    const brand = container.querySelector<HTMLAnchorElement>('a[aria-label="Ir a Inicio"]');
    expect(brand?.className).toContain("lg:hidden");
  });

  it("invents no navigation when no shell supplies a destination", async () => {
    await renderTopBar();
    expect(container.querySelector('a[aria-label="Ir a Inicio"]')).toBeNull();
    // Standalone (labs) still renders its mark — just not as a link.
    expect(container.querySelector('span[role="img"]')).not.toBeNull();
  });

  it("keeps every editor tool alongside the brand link", async () => {
    await renderTopBar("/destino-del-host");

    // Requirement: navigation must not cost the editor its tools.
    for (const label of ["Tipo de página", "Variante", "Rehacer", "Publicar"]) {
      const control =
        container.querySelector(`[aria-label="${label}"]`) ??
        [...container.querySelectorAll("button")].find(
          (button) => (button.textContent ?? "").trim() === label,
        );
      expect(control, `${label} must still be rendered`).not.toBeNull();
    }
  });
});

/**
 * The editor is a self-contained asset: it renders the destination a shell hands
 * it and owns no platform routing of its own. Reading the registry directly (or
 * burying the literal) would quietly re-couple it to platform navigation policy.
 */
describe("Magic editor platform isolation", () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../isolated");

  function sourceFiles(directory: string): string[] {
    return readdirSync(directory).flatMap((entry) => {
      if (entry === "__tests__") return [];
      const full = join(directory, entry);
      if (statSync(full).isDirectory()) return sourceFiles(full);
      return /\.tsx?$/.test(entry) ? [full] : [];
    });
  }

  const files = sourceFiles(root);

  it("finds the isolated editor sources to check", () => {
    expect(files.length).toBeGreaterThan(100);
    // Guards against a vacuous scan: an empty read would make the two
    // assertions below pass no matter what the editor actually contains.
    const sources = files.map((file) => readFileSync(file, "utf8"));
    expect(sources.some((source) => source.includes("TopBar"))).toBe(true);
    expect(sources.every((source) => source.length > 0)).toBe(true);
  });

  it("never imports the platform navigation registry", () => {
    for (const file of files) {
      expect(readFileSync(file, "utf8"), `${file} must not import platform-navigation`).not.toContain(
        "platform-navigation",
      );
    }
  });

  it("never hardcodes the platform home route", () => {
    expect(PLATFORM_HOME_HREF).toBe("/profile");
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, `${file} must not hardcode ${PLATFORM_HOME_HREF}`).not.toContain(
        `"${PLATFORM_HOME_HREF}"`,
      );
      expect(source, `${file} must not hardcode ${PLATFORM_HOME_HREF}`).not.toContain(
        `'${PLATFORM_HOME_HREF}'`,
      );
    }
  });
});
