import { describe, expect, it } from "vitest";
import {
  BREAKPOINT_WIDTHS,
  COMPACT_BIO_WIDTHS,
  canvasModeForDocument,
  canvasWidthForDocument,
} from "../layouts";

describe("editor canvas surface authority", () => {
  it("keeps profile documents on the compact Bio canvas", () => {
    expect(canvasModeForDocument("profile")).toBe("compact-bio");
    expect(canvasWidthForDocument("profile", "desktop")).toBe(COMPACT_BIO_WIDTHS.desktop);
  });

  it.each(["catalog", "menu", "portfolio", "services"])(
    "routes the advanced page type %s to the premium web-page canvas",
    () => {
      expect(canvasModeForDocument("page")).toBe("premium-web-page");
      expect(canvasWidthForDocument("page", "desktop")).toBe(BREAKPOINT_WIDTHS.desktop);
    },
  );

  it("keeps logical width independent from visual zoom", () => {
    const desktopWidth = canvasWidthForDocument("page", "desktop");
    expect(desktopWidth).toBe(1180);
    expect(desktopWidth).toBe(canvasWidthForDocument("page", "desktop"));
  });
});
