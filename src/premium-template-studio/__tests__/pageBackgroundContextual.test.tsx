// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import {
  requestCanvasFocus,
  requestInspectorFocus,
  shouldScrollInspectorToFocus,
  subscribeCanvasFocus,
  subscribeInspectorFocus,
} from "../components/inspector/inspectorFocus";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { createBlock } from "../constants/blockDefinitions";
import { createDemoConfig } from "../templates/definitions";
import { createInitialState, templateReducer } from "../state/templateReducer";
import {
  resolveCapabilityAccess,
  POWER_EDITOR_EARLY_ACCESS_CAPABILITIES,
} from "../../lib/product-entitlements/capabilities";
import type { ProductCapability } from "../../lib/product-entitlements/capabilities";
import { authorizeCanonicalMutation } from "../../lib/product-entitlements/mutation-guard";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Page background contextual editing (Phase 5C5)", () => {
  describe("target acceptance", () => {
    it("accepts page-background as a ContextualTarget (scroll-worthy, never null)", () => {
      expect(shouldScrollInspectorToFocus("page-background")).toBe(true);
      expect(shouldScrollInspectorToFocus(null)).toBe(false);
    });
  });

  describe("focus signals", () => {
    it("delivers a canvas→inspector page-background request exactly once and unsubscribes", () => {
      const received: string[] = [];
      const off = subscribeInspectorFocus((t) => received.push(t));
      requestInspectorFocus("page-background");
      expect(received).toEqual(["page-background"]);
      off();
      requestInspectorFocus("page-background");
      expect(received).toEqual(["page-background"]);
    });

    it("delivers an inspector→canvas page-background request exactly once", () => {
      const received: string[] = [];
      const off = subscribeCanvasFocus((t) => received.push(t));
      requestCanvasFocus("page-background");
      expect(received).toEqual(["page-background"]);
      off();
      requestCanvasFocus("page-background");
      expect(received).toEqual(["page-background"]);
    });
  });

  describe("DOM wiring", () => {
    function renderPageMarkup(mode: "edit" | "public") {
      const config = createDemoConfig();
      return renderToStaticMarkup(
        createElement(TemplateRenderer, {
          config,
          breakpoint: "desktop",
          mode,
          editing: mode === "edit" ? { onSelectPageBackground: () => {} } : undefined,
        }),
      );
    }

    it("edit mode exposes data-editor-target=page-background on the page surface", () => {
      const markup = renderPageMarkup("edit");
      expect(markup).toContain('data-editor-target="page-background"');
    });

    it("public rendering never gains the page-background editing click identity", () => {
      const markup = renderPageMarkup("public");
      expect(markup).not.toContain('data-editor-target="page-background"');
    });
  });

  describe("canvas click → page background selection", () => {
    it("clicking the exposed page surface emits the exact page-background selection", () => {
      const received: string[] = [];
      const host = document.createElement("div");
      document.body.appendChild(host);
      const root = createRoot(host);
      const config = createDemoConfig();
      const hero = { ...createBlock("hero"), id: "page-bg-hero" };
      try {
        act(() => {
          root.render(
            createElement(TemplateRenderer, {
              config: { ...config, blocks: [hero] },
              breakpoint: "desktop",
              mode: "edit",
              editing: { onSelectPageBackground: () => received.push("page-background") },
            }),
          );
        });

        const page = host.querySelector<HTMLElement>('[data-editor-target="page-background"]');
        expect(page).not.toBeNull();

        act(() => {
          page!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        });

        expect(received).toEqual(["page-background"]);
      } finally {
        act(() => root.unmount());
        document.body.removeChild(host);
      }
    });
  });

  describe("child / block priority protection", () => {
    function makeHero(id: string) {
      const base = createBlock("hero");
      return {
        ...base,
        id,
        content: {
          ...base.content,
          title: "Test Title",
          primaryCTA: { label: "Primary CTA", url: "https://example.com" },
        },
      } as ReturnType<typeof createBlock>;
    }

    function renderHero(id: string, editing: Record<string, unknown>) {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const root = createRoot(host);
      const config = createDemoConfig();
      act(() => {
        root.render(
          createElement(TemplateRenderer, {
            config: { ...config, blocks: [makeHero(id)] },
            breakpoint: "desktop",
            mode: "edit",
            editing,
          }),
        );
      });
      return { host, root };
    }

    it("clicking the Hero title resolves as title, never page-background", () => {
      const pageIds: string[] = [];
      const textTargets: string[] = [];
      const { host, root } = renderHero("page-bg-title", {
        onSelectPageBackground: () => pageIds.push("page-background"),
        onSelectHeroText: (_id: string, target: string) => textTargets.push(target),
      });
      try {
        const title = host.querySelector<HTMLElement>('[data-editor-target="hero-title"]');
        expect(title).not.toBeNull();
        act(() => {
          title!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        });
        expect(pageIds).toEqual([]);
        expect(textTargets).toEqual(["title"]);
      } finally {
        act(() => root.unmount());
        document.body.removeChild(host);
      }
    });

    it("clicking the Hero CTA resolves as CTA, never page-background", () => {
      const pageIds: string[] = [];
      const ctaIds: string[] = [];
      const { host, root } = renderHero("page-bg-cta", {
        onSelectPageBackground: () => pageIds.push("page-background"),
        onSelectHeroCta: (id: string) => ctaIds.push(id),
      });
      try {
        const cta = host.querySelector<HTMLElement>('[data-editor-target="hero-cta"] button');
        expect(cta).not.toBeNull();
        act(() => {
          cta!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        });
        expect(pageIds).toEqual([]);
        expect(ctaIds).toEqual(["page-bg-cta"]);
      } finally {
        act(() => root.unmount());
        document.body.removeChild(host);
      }
    });

    it("clicking the Hero image resolves as image, never page-background", () => {
      const pageIds: string[] = [];
      const imageIds: string[] = [];
      const { host, root } = renderHero("page-bg-image", {
        onSelectPageBackground: () => pageIds.push("page-background"),
        onSelectHeroImage: (id: string) => imageIds.push(id),
      });
      try {
        const image = host.querySelector<HTMLElement>('[data-editor-target="hero-image"]');
        expect(image).not.toBeNull();
        act(() => {
          image!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        });
        expect(pageIds).toEqual([]);
        expect(imageIds).toEqual(["page-bg-image"]);
      } finally {
        act(() => root.unmount());
        document.body.removeChild(host);
      }
    });

    it("clicking the Hero background resolves as hero-background, never page-background", () => {
      const pageIds: string[] = [];
      const bgIds: string[] = [];
      const { host, root } = renderHero("page-bg-herobg", {
        onSelectPageBackground: () => pageIds.push("page-background"),
        onSelectHeroBackground: (id: string) => bgIds.push(id),
      });
      try {
        const bg = host.querySelector<HTMLElement>('[data-editor-target="hero-background"]');
        expect(bg).not.toBeNull();
        act(() => {
          bg!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        });
        expect(pageIds).toEqual([]);
        expect(bgIds).toEqual(["page-bg-herobg"]);
      } finally {
        act(() => root.unmount());
        document.body.removeChild(host);
      }
    });

    it("clicking a rendered block resolves as block selection, never page-background", () => {
      const pageIds: string[] = [];
      const blockIds: string[] = [];
      const { host, root } = renderHero("page-bg-block", {
        onSelectPageBackground: () => pageIds.push("page-background"),
        onSelect: (id: string) => blockIds.push(id),
      });
      try {
        const block = host.querySelector<HTMLElement>('[data-block-id="page-bg-block"]');
        expect(block).not.toBeNull();
        act(() => {
          block!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        });
        expect(pageIds).toEqual([]);
        expect(blockIds).toEqual(["page-bg-block"]);
      } finally {
        act(() => root.unmount());
        document.body.removeChild(host);
      }
    });
  });

  describe("page background type binding (Phase 5C5B)", () => {
    function makeStateWithBackground() {
      const config = createDemoConfig();
      config.theme.background = {
        type: "gradient",
        color: "#123456",
        gradient: { kind: "linear", angle: 90, from: "#111111", to: "#222222" },
        imageUrl: "https://example.com/bg.jpg",
        pattern: "dots",
        blur: 0,
      };
      return createInitialState(config);
    }

    it("setting type=solid preserves gradient/image/pattern/color values", () => {
      const next = templateReducer(makeStateWithBackground(), {
        type: "patch",
        path: "theme.background.type",
        value: "solid",
      });
      const bg = next.config.theme.background;
      expect(bg.type).toBe("solid");
      expect(bg.gradient).toEqual({ kind: "linear", angle: 90, from: "#111111", to: "#222222" });
      expect(bg.imageUrl).toBe("https://example.com/bg.jpg");
      expect(bg.pattern).toBe("dots");
      expect(bg.color).toBe("#123456");
    });

    it("Gradient → Solid → Gradient preserves previous gradient configuration", () => {
      const base = makeStateWithBackground();
      const solid = templateReducer(base, { type: "patch", path: "theme.background.type", value: "solid" });
      const back = templateReducer(solid, { type: "patch", path: "theme.background.type", value: "gradient" });
      expect(back.config.theme.background.gradient).toEqual({
        kind: "linear",
        angle: 90,
        from: "#111111",
        to: "#222222",
      });
    });

    it("changing gradient.from preserves to/angle/kind and unrelated fields", () => {
      const next = templateReducer(makeStateWithBackground(), {
        type: "patch",
        path: "theme.background.gradient.from",
        value: "#ffffff",
      });
      const g = next.config.theme.background.gradient!;
      expect(g.from).toBe("#ffffff");
      expect(g.to).toBe("#222222");
      expect(g.angle).toBe(90);
      expect(g.kind).toBe("linear");
      expect(next.config.theme.background.imageUrl).toBe("https://example.com/bg.jpg");
    });

    it("changing gradient.angle updates angle and preserves from/to", () => {
      const next = templateReducer(makeStateWithBackground(), {
        type: "patch",
        path: "theme.background.gradient.angle",
        value: 180,
      });
      expect(next.config.theme.background.gradient!.angle).toBe(180);
      expect(next.config.theme.background.gradient!.from).toBe("#111111");
      expect(next.config.theme.background.gradient!.to).toBe("#222222");
    });

    it("changing gradient.to updates to and preserves from/angle", () => {
      const next = templateReducer(makeStateWithBackground(), {
        type: "patch",
        path: "theme.background.gradient.to",
        value: "#333333",
      });
      expect(next.config.theme.background.gradient!.to).toBe("#333333");
      expect(next.config.theme.background.gradient!.from).toBe("#111111");
    });

    it("updating imageUrl binds imageUrl and preserves other modes", () => {
      const next = templateReducer(makeStateWithBackground(), {
        type: "patch",
        path: "theme.background.imageUrl",
        value: "https://example.com/new.jpg",
      });
      expect(next.config.theme.background.imageUrl).toBe("https://example.com/new.jpg");
      expect(next.config.theme.background.gradient).toEqual({
        kind: "linear",
        angle: 90,
        from: "#111111",
        to: "#222222",
      });
    });

    it("removing imageUrl does not corrupt other modes", () => {
      const next = templateReducer(makeStateWithBackground(), {
        type: "patch",
        path: "theme.background.imageUrl",
        value: "",
      });
      expect(next.config.theme.background.imageUrl).toBe("");
      expect(next.config.theme.background.type).toBe("gradient");
      expect(next.config.theme.background.gradient).toEqual({
        kind: "linear",
        angle: 90,
        from: "#111111",
        to: "#222222",
      });
      expect(next.config.theme.background.pattern).toBe("dots");
    });

    it("updating blur binds the existing blur field", () => {
      const next = templateReducer(makeStateWithBackground(), {
        type: "patch",
        path: "theme.background.blur",
        value: 8,
      });
      expect(next.config.theme.background.blur).toBe(8);
    });

    it("selecting a pattern updates the existing pattern field", () => {
      const next = templateReducer(makeStateWithBackground(), {
        type: "patch",
        path: "theme.background.pattern",
        value: "rings",
      });
      expect(next.config.theme.background.pattern).toBe("rings");
      expect(next.config.theme.background.type).toBe("gradient");
    });

    it("all supported pattern options remain accepted", () => {
      for (const option of ["dots", "grid", "noise", "rings"]) {
        const next = templateReducer(makeStateWithBackground(), {
          type: "patch",
          path: "theme.background.pattern",
          value: option,
        });
        expect(next.config.theme.background.pattern).toBe(option);
      }
    });
  });

  describe("Power Editor early-access entitlement unlock (Phase 5C5E)", () => {
    it("premium_background_effects resolves ALLOW for the free tier during early access", () => {
      const decision = resolveCapabilityAccess("free", "premium_background_effects");
      expect(decision.state).toBe("ALLOW");
      expect(decision.editable).toBe(true);
    });

    it("every early-access Power Editor editing capability resolves ALLOW for free", () => {
      for (const capability of POWER_EDITOR_EARLY_ACCESS_CAPABILITIES) {
        expect(resolveCapabilityAccess("free", capability).state, capability).toBe("ALLOW");
      }
    });

    it("authorizeCanonicalMutation ALLOWs EDIT_PREMIUM_BACKGROUND for free (guarded dispatch no longer drops it)", () => {
      const auth = authorizeCanonicalMutation("free", { kind: "EDIT_PREMIUM_BACKGROUND" });
      expect(auth.decision).toBe("ALLOW");
      expect(auth.capability).toBe("premium_background_effects");
    });

    it("background mutation reaches the reducer after authorization", () => {
      const state = createInitialState(createDemoConfig());
      const next = templateReducer(state, {
        type: "patch",
        path: "theme.background.type",
        value: "solid",
      });
      expect(next.config.theme.background.type).toBe("solid");
    });

    it("remove_cripqer_branding remains governed by normal policy (not unlocked)", () => {
      expect(resolveCapabilityAccess("free", "remove_cripqer_branding").state).toBe("LOCKED");
      expect(authorizeCanonicalMutation("free", { kind: "REMOVE_CRIPQER_BRANDING" }).decision).toBe(
        "DENY",
      );
    });

    it("unknown capabilities remain fail-closed (LOCKED, UNKNOWN_CAPABILITY)", () => {
      const unknown = "not_a_real_capability" as ProductCapability;
      const decision = resolveCapabilityAccess("free", unknown);
      expect(decision.state).toBe("LOCKED");
      expect(decision.reason).toBe("UNKNOWN_CAPABILITY");
    });
  });
});
