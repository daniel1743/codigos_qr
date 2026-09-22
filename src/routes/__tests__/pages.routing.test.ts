import { describe, expect, it } from "vitest";
import { routeTree } from "../../routeTree.gen";

// The generated route tree keeps child routes under `.children`, and the
// route ids from the `.update()` calls live under `.options.id` (relative ids
// for nested routes, e.g. "/$pageId" under "/pages").
type AnyRoute = { options?: Record<string, unknown>; children?: AnyRoute[] };

function findChild(routes: AnyRoute[] | undefined, id: string): AnyRoute | undefined {
  return routes?.find((route) => route.options?.id === id);
}

describe("pages nested routing (PAGES_4C)", () => {
  const root = routeTree as unknown as AnyRoute;
  const pages = findChild(root.children, "/pages");
  const pageDetail = findChild(pages?.children, "/$pageId");
  const pagesNew = findChild(pages?.children, "/new");
  const pageEdit = findChild(pageDetail?.children, "/edit");

  it("registers /pages as a parent route that supports child outlet", () => {
    expect(pages).toBeTruthy();
    // Child routes only render through the parent's <Outlet />.
    expect(pageDetail).toBeTruthy();
    expect(pagesNew).toBeTruthy();
  });

  it("renders the new-page child route under /pages", () => {
    expect(pagesNew?.options?.component).toBeTruthy();
  });

  it("renders PageDetail under /pages/$pageId", () => {
    expect(pageDetail?.options?.component).toBeTruthy();
  });

  it("keeps /pages/$pageId/edit nested under /pages/$pageId", () => {
    expect(pageEdit).toBeTruthy();
    expect(pageEdit?.options?.component).toBeTruthy();
  });

  it("wires /pages/$pageId/edit to the PageDetail parent (PAGES_4D)", () => {
    // The generated route registers /pages/$pageId (PageDetail) as the parent
    // of /pages/$pageId/edit, so PageDetail must render <Outlet /> for the child.
    const parent = (
      pageEdit?.options as { getParentRoute?: () => { options?: { id?: string } } }
    )?.getParentRoute?.();
    expect(parent?.options?.id).toBe("/$pageId");
  });
});
