// Mobile-dock contextual focus wiring (CRIPQER_POWER_MOBILE_ZERO_FRICTION).
//
// The mobile `MobileDock` reuses the exact same focus signals the desktop
// Inspector uses, plus `shouldResetInspectorScroll` for plain block selection
// (video/card/etc., which emit no `requestInspectorFocus`). This suite asserts
// the target set and the gating/scrolling primitives the mobile dock depends on
// are complete and stable — without mounting the heavy editor component graph.
import { describe, expect, it } from "vitest";
import {
  computeInspectorFocusScroll,
  requestInspectorFocus,
  shouldScrollInspectorToFocus,
  subscribeInspectorFocus,
} from "../components/inspector/inspectorFocus";
import { shouldResetInspectorScroll } from "../components/inspector/inspectorScroll";

describe("MobileDock contextual focus targets (mobile-only)", () => {
  describe("report-required focus targets are registered and accepted", () => {
    const targets = {
      avatar: "profile-avatar",
      banner: "profile-cover",
      title: "hero-title",
      paragraph: "hero-description",
      button: "hero-cta",
      image: "hero-image",
    } as const;

    it.each(Object.entries(targets))("%s → %s", (_key, target) => {
      // The mobile dock scrolls only for a non-null focus request.
      expect(shouldScrollInspectorToFocus(target)).toBe(true);

      // Each target delivers to subscribers exactly once and unsubscribes.
      const received: string[] = [];
      const off = subscribeInspectorFocus((t) => received.push(t));
      requestInspectorFocus(target);
      expect(received).toEqual([target]);
      off();
      requestInspectorFocus(target);
      expect(received).toEqual([target]);
    });
  });

  describe("plain block selection (video/card) switches to Properties", () => {
    it("a changed selection identity resets the sheet to the block controls", () => {
      // Tapping a video block dispatches selectBlock only (no focus request).
      // The mobile dock uses shouldResetInspectorScroll to surface Properties
      // and show the block inspector from the top.
      expect(shouldResetInspectorScroll(null, "video-1")).toBe(true);
      expect(shouldResetInspectorScroll("hero-1", "video-1")).toBe(true);
    });

    it("re-selecting the same block never re-triggers the sheet reset", () => {
      expect(shouldResetInspectorScroll("video-1", "video-1")).toBe(false);
    });

    it("switching from a block back to the profile also resets", () => {
      expect(shouldResetInspectorScroll("video-1", null)).toBe(true);
    });
  });

  describe("internal sheet scroll only (no camera/document movement)", () => {
    it("re-centers an offscreen target inside the sheet viewport", () => {
      const viewport = { top: 0, bottom: 600 };
      // Target below the visible band (center at 860 → 860 − 270 = +590).
      const delta = computeInspectorFocusScroll(viewport, { top: 820, bottom: 900 });
      expect(delta).toBeGreaterThan(0);
    });

    it("leaves an already-centered target untouched (no snap-back loop)", () => {
      const viewport = { top: 0, bottom: 600 };
      // Center at 270 ≈ 45% of 600 → inside the comfortable band.
      expect(computeInspectorFocusScroll(viewport, { top: 240, bottom: 300 })).toBe(0);
    });
  });
});
