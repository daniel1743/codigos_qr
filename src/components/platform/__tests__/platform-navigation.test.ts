import { describe, expect, it } from "vitest";
import { matchesPlatformNavActivePath, PLATFORM_NAV_ITEMS } from "../platform-navigation";

describe("platform navigation", () => {
  it("keeps the six approved authenticated destinations in their product order", () => {
    expect(
      PLATFORM_NAV_ITEMS.filter((item) => item.section === "primary").map(({ label, href }) => ({
        label,
        href,
      })),
    ).toEqual([
      { label: "Inicio", href: "/profile" },
      { label: "Mi página", href: "/page" },
      { label: "Editor", href: "/editor" },
      { label: "QR", href: "/qr" },
      { label: "Documentos", href: "/encrypted-documents" },
      { label: "Perfil", href: "/account" },
    ]);
  });

  it("marks each product destination active, including both editor routes", () => {
    const expectedPaths = {
      profile: "/profile",
      pagina: "/page",
      editor: "/editor",
      qr: "/qr",
      documents: "/encrypted-documents",
      perfil: "/account",
    };

    for (const [id, pathname] of Object.entries(expectedPaths)) {
      const item = PLATFORM_NAV_ITEMS.find((candidate) => candidate.id === id);
      expect(item).toBeDefined();
      expect(matchesPlatformNavActivePath(item!.activeMatch, pathname)).toBe(true);
    }

    const editor = PLATFORM_NAV_ITEMS.find((item) => item.id === "editor");
    expect(matchesPlatformNavActivePath(editor!.activeMatch, "/power-editor")).toBe(true);
  });
});
