import { expect, test } from "@playwright/test";
import { captureBaseline, login, sameStoredData, snapshot } from "./helpers/phase6-qa";

const enabledBaseUrl = process.env.QA_ONBOARDING_ON_URL ?? "http://localhost:8081";
const disabledBaseUrl = process.env.QA_ONBOARDING_OFF_URL ?? "http://localhost:8082";

test("keeps Onboarding V2 hidden while the feature flag is off", async ({ page }) => {
  await page.goto(`${disabledBaseUrl}/onboarding-preview`);
  await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
  await expect(page.locator('a[href="/onboarding-preview"]')).toHaveCount(0);
});

test("exposes the noindex QA seam only when the feature flag is on", async ({ page }) => {
  await page.goto(`${enabledBaseUrl}/onboarding-preview`);
  await expect(page.getByText(/Onboarding V2 · Paso 1 de 8/)).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow, noarchive",
  );
  await expect(page.locator('a[href="/onboarding-preview"]')).toHaveCount(0);
});

test("logout dispatches a real click and destroys the auth session", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, enabledBaseUrl);
  const before = await snapshot(page);
  captureBaseline(before);
  const events: string[] = [];
  const logoutResponses: number[] = [];
  page.on("console", (message) => { if (message.text().startsWith("[logout-event]")) events.push(message.text()); });
  page.on("response", (response) => { if (response.url().includes("/auth/v1/logout")) logoutResponses.push(response.status()); });
  await page.evaluate(() => {
    for (const name of ["pointerdown", "pointerup", "click"]) {
      document.addEventListener(name, (event) => {
        const button = (event.target as Element)?.closest("button");
        if (button?.textContent?.includes("Cerrar sesión")) console.log(`[logout-event] ${name}`);
      }, true);
    }
  });
  await page.getByRole("button", { name: "Abrir menú" }).click();
  const logout = page.getByRole("button", { name: "Cerrar sesión", exact: true });
  await expect(logout).toBeVisible();
  await logout.click({ delay: 250 });
  try {
    await expect(page).toHaveURL(`${enabledBaseUrl}/`, { timeout: 10_000 });
    await page.goto(`${enabledBaseUrl}/editor`);
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
    expect(logoutResponses).toContain(204);
    await login(page, enabledBaseUrl);
    sameStoredData(await snapshot(page), before);
  } finally {
    console.log(JSON.stringify({ events, logoutResponses, url: page.url(), expectedProfileId: before.profile.id }));
  }
});
