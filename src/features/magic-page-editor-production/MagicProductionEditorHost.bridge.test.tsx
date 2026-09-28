// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Page } from "../../types/database";
import { createCanonicalPageEnvelope } from "../../lib/canonical-page";
import { createPageStarterConfig } from "../../components/power-editor/pageStarterConfig";
import { serializeMagicEditorState } from "./magic-document";
import { MagicProductionEditorHost } from "./MagicProductionEditorHost";

const mocks = vi.hoisted(() => ({
  getOwnedPage: vi.fn(),
  saveDraft: vi.fn(),
  publish: vi.fn(),
  appProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("../../lib/supabase/client", () => ({
  getBrowserSupabaseClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: "owner" } } } }) },
  }),
}));
vi.mock("../../services/magic-page.service", () => ({
  magicPageService: {
    getOwnedPage: mocks.getOwnedPage,
    saveDraft: mocks.saveDraft,
    publish: mocks.publish,
  },
}));
vi.mock("../../isolated/magic-page-editor/MagicEditorApp", () => ({
  MagicEditorApp: (props: Record<string, unknown>) => {
    mocks.appProps.push(props);
    return null;
  },
}));
vi.mock("../../components/app-shell/MobilePlatformNav", () => ({ default: () => null }));

function ownedPage(templateConfig: unknown): Page {
  return {
    id: "page-id",
    title: "Página QA",
    page_type: "landing",
    template_config: templateConfig,
    published_revision: 4,
  } as Page;
}

describe("Bridge 1 host write boundary", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    mocks.appProps.length = 0;
    mocks.getOwnedPage.mockReset();
    mocks.saveDraft.mockReset();
    mocks.publish.mockReset();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function open(config: unknown) {
    mocks.getOwnedPage.mockResolvedValue(ownedPage(config));
    await act(async () => {
      root.render(<MagicProductionEditorHost pageId="page-id" />);
    });
  }

  it("opens canonical in the common UI with canonical callbacks and no Magic writes", async () => {
    const envelope = createCanonicalPageEnvelope(createPageStarterConfig("Canónica", "landing"));
    const before = JSON.stringify(envelope);
    await open(envelope);
    expect(mocks.appProps.at(-1)?.canonicalDocument).toBe(envelope.editorConfig);
    expect(mocks.appProps.at(-1)?.onCanonicalDocumentChange).toEqual(expect.any(Function));
    expect(mocks.appProps.at(-1)?.onCanonicalPublish).toEqual(expect.any(Function));
    expect(mocks.appProps.at(-1)?.onDocumentChange).toBeUndefined();
    expect(mocks.appProps.at(-1)?.onPublish).toBeUndefined();
    expect(mocks.saveDraft).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(JSON.stringify(envelope)).toBe(before);
  });

  it("opens Magic with its existing callbacks and does not convert on load", async () => {
    const magic = serializeMagicEditorState({
      templateId: "bio",
      doc: {
        blocks: [{ key: "hero", type: "hero" }],
        texts: {},
        textStyles: {},
        props: {},
        removed: {},
      },
    });
    const before = JSON.stringify(magic);
    await open(magic);
    expect(mocks.appProps.at(-1)?.initialDocument).toBeDefined();
    expect(mocks.appProps.at(-1)?.onDocumentChange).toEqual(expect.any(Function));
    expect(mocks.appProps.at(-1)?.onPublish).toEqual(expect.any(Function));
    expect(mocks.saveDraft).not.toHaveBeenCalled();
    expect(JSON.stringify(magic)).toBe(before);
  });

  it("opens null as an unsaved canonical document", async () => {
    await open(null);
    expect(mocks.appProps.at(-1)?.canonicalIsNew).toBe(true);
    expect(mocks.saveDraft).not.toHaveBeenCalled();
  });

  it("shows a safe state for unknown payloads without mounting a writer", async () => {
    await open({ unexpected: "keep-me" });
    expect(container.textContent).toContain("Documento no compatible");
    expect(mocks.appProps).toHaveLength(0);
    expect(mocks.saveDraft).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();
  });
});
