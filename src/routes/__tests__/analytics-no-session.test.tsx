// @vitest-environment happy-dom
/**
 * C2B8 regression — `/pages/$pageId/analytics` with no session.
 *
 * Produced defect (Chrome incognito, no session, canary ON):
 *
 *   · `resolveAnalyticsDashboardMode` starts the production route in `pending`
 *     (the gate can only be decided once the owner-scoped page row is loaded);
 *   · `supabase.auth.getUser()` returns `user === null`, so the effect threw
 *     "Debes iniciar sesión para ver estadísticas." BEFORE the gate resolved;
 *   · the error was stored, but both render and `finally` were gated on
 *     `mode === "pending"`, so `setLoading(false)` never ran and the screen
 *     stayed on "Cargando estadísticas…" forever, hiding the error.
 *
 * These tests simulate the production gate verdict (`pending`), because Vitest
 * runs with `import.meta.env.DEV === true`, where the real gate resolves the
 * mode from the query string and never produces `pending`.
 */
import { act, type ComponentType, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PAGE_ID = "1c4aa062-a012-47e4-b0f1-99ca8e80d1ec";
const AUTH_MESSAGE = "Debes iniciar sesión para ver estadísticas.";
const NO_ACCESS_MESSAGE = "No se encontró esta página o no tienes acceso a ella.";
const LOADING_MESSAGE = "Cargando estadísticas…";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), getOwnPageById: vi.fn() }));

vi.mock("../../lib/supabase/client", () => ({
  getBrowserSupabaseClient: () => ({ auth: { getUser: mocks.getUser } }),
}));

vi.mock("../../services/page.service", () => ({
  pageService: { getOwnPageById: mocks.getOwnPageById },
}));

vi.mock("../../services/analyticsService", () => ({
  analyticsService: { getPageAnalytics: vi.fn() },
}));

vi.mock("../../services/analyticsRealDataService", () => ({
  analyticsRealDataService: { getRealPageEvents: vi.fn() },
  realDataPeriodBounds: () => ({ from: "", to: "" }),
}));

vi.mock("../../lib/billing/analytics-entitlement-server", () => ({
  getAnalyticsEffectiveTierFn: () => Promise.resolve("free"),
}));

/** Production canary verdict while the owner-scoped page row is not loaded yet. */
vi.mock("../../lib/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/analytics")>();
  return { ...actual, resolveAnalyticsDashboardMode: () => "pending" as const };
});

vi.mock("../../components/app-shell/AppShell", () => ({
  AppShell: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ to, children }: { to?: unknown; children?: ReactNode }) => (
      <a href={String(to)}>{children}</a>
    ),
    createFileRoute: () => (options: { component: ComponentType }) => ({
      options,
      useParams: () => ({ pageId: PAGE_ID }),
    }),
  };
});

import { Route } from "../pages.$pageId.analytics";

const PageAnalytics = (Route as unknown as { options: { component: ComponentType } }).options
  .component;

describe("C2B8 /pages/$pageId/analytics — no session", () => {
  let container: HTMLDivElement;
  let root: Root;

  /**
   * The route component is code-split (`React.lazy`), so the first commit waits
   * for its chunk; afterwards the async auth chain has to settle too.
   */
  const waitForText = async (title: string, text: string, timeoutMs = 15_000) => {
    await vi.waitFor(
      async () => {
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 25));
        });
        expect(container.textContent ?? "", `timed out waiting for ${title}`).toContain(text);
      },
      { timeout: timeoutMs, interval: 50 },
    );
  };

  beforeEach(() => {
    const actEnvironment = globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    mocks.getUser.mockReset();
    mocks.getOwnPageById.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const renderRoute = async () => {
    await act(async () => {
      root.render(<PageAnalytics />);
    });
  };

  it("keeps the loading state while the canary gate is still unresolved", async () => {
    mocks.getUser.mockReturnValue(new Promise(() => {}));
    await renderRoute();

    await waitForText("the unresolved canary gate", LOADING_MESSAGE);
    expect(mocks.getOwnPageById).not.toHaveBeenCalled();
  }, 20_000);

  it("ends deterministically in the login state when there is no session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await renderRoute();

    await waitForText("the no-session error state", AUTH_MESSAGE);

    expect(container.textContent).not.toContain(LOADING_MESSAGE);
    expect(mocks.getOwnPageById).not.toHaveBeenCalled();

    const signIn = container.querySelector('a[href="/login"]');
    expect(signIn?.textContent).toContain("Iniciar sesión");
  }, 20_000);

  it("never offers the sign-in action for a page the session does not own", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mocks.getOwnPageById.mockResolvedValue(null);
    await renderRoute();

    await waitForText("the not-owner error state", NO_ACCESS_MESSAGE);

    expect(container.textContent).not.toContain(LOADING_MESSAGE);
    expect(container.querySelector('a[href="/login"]')).toBeNull();
  }, 20_000);
});
