import { test, expect } from "@playwright/test";
import fs from "fs";

/**
 * C2B6 — component-specific runtime visual evidence.
 *
 * Targets the DEV-only `/analytics-visual-qa` QA seam so every capture is
 * deterministic (seeded fixtures, injected plan, no Supabase/auth/network).
 * Split into small independent tests so a single component never stalls the
 * whole suite (the previous run's single 60s mega-test timed out on
 * `networkidle`, which never resolves while Supabase realtime is connected).
 */

const DIR = "screenshots/c2b6";

interface OpenOptions {
  scenario?: string;
  plan?: string;
  width?: number;
  height?: number;
}

async function openDashboard(
  page: import("@playwright/test").Page,
  { scenario = "growing_business", plan = "free", width = 1440, height = 900 }: OpenOptions = {},
) {
  await page.setViewportSize({ width, height });
  await page.goto(`/analytics-visual-qa?scenario=${scenario}&plan=${plan}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator(".cq-analytics")).toBeVisible({ timeout: 30_000 });
}

function ensureDir() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
}

async function expectNoGlobalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
}

async function expectFunnelStages(funnelCard: import("@playwright/test").Locator) {
  const stepLabels = await funnelCard
    .locator(".cq-funnel__step")
    .evaluateAll((els) => els.map((el) => el.querySelector("span")?.textContent?.trim() ?? ""));
  expect(stepLabels).toEqual(["QR scan", "Page view", "Interaction", "Action"]);
}

test.describe("C2B6 component visual evidence", () => {
  test("QR funnel — desktop", async ({ page }) => {
    ensureDir();
    await openDashboard(page, { scenario: "growing_business", plan: "business" });

    const funnelCard = page.locator(".cq-card", { has: page.locator(".cq-funnel") });
    await expect(funnelCard).toBeVisible();
    await expect(funnelCard).toContainText("Conversion funnel");
    await expectFunnelStages(funnelCard);
    await expectNoGlobalOverflow(page);

    await funnelCard.scrollIntoViewIfNeeded();
    await funnelCard.screenshot({ path: `${DIR}/qr-funnel-desktop.png` });
  });

  test("QR funnel — mobile 390", async ({ page }) => {
    ensureDir();
    await openDashboard(page, {
      scenario: "growing_business",
      plan: "business",
      width: 390,
      height: 844,
    });

    const funnelCard = page.locator(".cq-card", { has: page.locator(".cq-funnel") });
    await expect(funnelCard).toBeVisible();
    await expect(funnelCard).toContainText("Conversion funnel");
    await expectFunnelStages(funnelCard);
    await expectNoGlobalOverflow(page);

    await funnelCard.scrollIntoViewIfNeeded();
    await funnelCard.screenshot({ path: `${DIR}/qr-funnel-mobile-390.png` });
  });

  test("Hot hours heatmap — mobile 390", async ({ page }) => {
    ensureDir();
    await openDashboard(page, {
      scenario: "growing_business",
      plan: "pro",
      width: 390,
      height: 844,
    });

    const heatmap = page.getByRole("img", { name: "Activity by weekday and hour" });
    await expect(heatmap).toBeVisible();
    const hotHoursCard = page.locator(".cq-card", { has: page.locator(".cq-heatmap") });
    await expect(hotHoursCard).toContainText("Hot hours");
    await expect(hotHoursCard.locator(".cq-heatmap__scroll")).toBeVisible();
    await expectNoGlobalOverflow(page);

    await hotHoursCard.scrollIntoViewIfNeeded();
    await hotHoursCard.screenshot({ path: `${DIR}/heatmap-mobile-390.png` });
  });

  test("Notification center — open state", async ({ page }) => {
    ensureDir();
    // Open state rendered via the DEV-only notifications surface (SSR), because
    // client hydration/interactivity is unavailable in this dev sandbox.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/analytics-visual-qa?surface=notifications", {
      waitUntil: "domcontentloaded",
    });

    const panel = page.locator(".cq-nc__panel");
    await expect(panel).toBeVisible({ timeout: 30_000 });
    await expect(panel.locator(".cq-nc__item")).toHaveCount(3);

    // Bell reflects the open state and is a native focusable button.
    const bell = page.locator(".cq-nc__bell");
    await expect(bell).toHaveAttribute("aria-expanded", "true");
    await expect(bell).toBeEnabled();

    // Close control is an accessible labelled button.
    const close = page.getByRole("button", { name: "Close notifications" });
    await expect(close).toBeVisible();

    await panel.screenshot({ path: `${DIR}/notification-center-open.png` });
  });

  test("Smart toast — visible and dismissible", async ({ page }) => {
    ensureDir();
    await openDashboard(page, { scenario: "growing_business", plan: "pro" });

    const toast = page.locator(".cq-toast").first();
    await expect(toast).toBeVisible({ timeout: 10_000 });
    await expect(toast.getByRole("button", { name: "Dismiss notification" })).toBeVisible();
    await toast.screenshot({ path: `${DIR}/smart-toast.png` });
  });

  test("Free plan — locked widget state", async ({ page }) => {
    ensureDir();
    await openDashboard(page, { scenario: "growing_business", plan: "free" });

    const locked = page.locator(".cq-locked").first();
    await expect(locked).toBeVisible();
    await expect(locked).toContainText("Unlock this view");
    await expect(locked).toContainText("No sample numbers are shown here");
    await expect(locked.getByRole("button", { name: /Upgrade to/ })).toBeVisible();

    await locked.scrollIntoViewIfNeeded();
    await locked.screenshot({ path: `${DIR}/free-locked-state.png` });
  });

  test("Paid plan — unlocked widget state", async ({ page }) => {
    ensureDir();
    await openDashboard(page, { scenario: "growing_business", plan: "business" });

    await expect(page.locator(".cq-locked")).toHaveCount(0);
    await expect(page.locator(".cq-funnel")).toBeVisible();

    const funnelCard = page.locator(".cq-card", { has: page.locator(".cq-funnel") });
    await funnelCard.scrollIntoViewIfNeeded();
    await funnelCard.screenshot({ path: `${DIR}/paid-unlocked-state.png` });
  });

  test("No-data / learning state", async ({ page }) => {
    ensureDir();
    await openDashboard(page, { scenario: "no_data", plan: "free" });

    const welcome = page.locator(".cq-welcome");
    await expect(welcome).toBeVisible();
    await expect(welcome).toHaveAttribute("data-state", "learning");
    await expect(welcome).toContainText("still learning");
    await expect(page.locator(".cq-funnel")).toHaveCount(0);
    await expect(page.locator(".cq-heatmap")).toHaveCount(0);

    await page.locator(".cq-analytics").screenshot({
      path: `${DIR}/empty-learning-state.png`,
      fullPage: true,
    });
  });
});
