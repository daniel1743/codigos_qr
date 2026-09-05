# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\phase6-local-unblock.spec.ts >> exposes the noindex QA seam only when the feature flag is on
- Location: e2e\phase6-local-unblock.spec.ts:13:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/onboarding-preview
Call log:
  - navigating to "http://localhost:8081/onboarding-preview", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { captureBaseline, login, sameStoredData, snapshot } from "./helpers/phase6-qa";
  3  | 
  4  | const enabledBaseUrl = process.env.QA_ONBOARDING_ON_URL ?? "http://localhost:8081";
  5  | const disabledBaseUrl = process.env.QA_ONBOARDING_OFF_URL ?? "http://localhost:8082";
  6  | 
  7  | test("keeps Onboarding V2 hidden while the feature flag is off", async ({ page }) => {
  8  |   await page.goto(`${disabledBaseUrl}/onboarding-preview`);
  9  |   await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
  10 |   await expect(page.locator('a[href="/onboarding-preview"]')).toHaveCount(0);
  11 | });
  12 | 
  13 | test("exposes the noindex QA seam only when the feature flag is on", async ({ page }) => {
> 14 |   await page.goto(`${enabledBaseUrl}/onboarding-preview`);
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/onboarding-preview
  15 |   await expect(page.getByText(/Onboarding V2 · Paso 1 de 8/)).toBeVisible({ timeout: 45_000 });
  16 |   await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
  17 |     "content",
  18 |     "noindex, nofollow, noarchive",
  19 |   );
  20 |   await expect(page.locator('a[href="/onboarding-preview"]')).toHaveCount(0);
  21 | });
  22 | 
  23 | test("logout dispatches a real click and destroys the auth session", async ({ page }) => {
  24 |   await page.setViewportSize({ width: 390, height: 844 });
  25 |   await login(page, enabledBaseUrl);
  26 |   const before = await snapshot(page);
  27 |   captureBaseline(before);
  28 |   const events: string[] = [];
  29 |   const logoutResponses: number[] = [];
  30 |   page.on("console", (message) => { if (message.text().startsWith("[logout-event]")) events.push(message.text()); });
  31 |   page.on("response", (response) => { if (response.url().includes("/auth/v1/logout")) logoutResponses.push(response.status()); });
  32 |   await page.evaluate(() => {
  33 |     for (const name of ["pointerdown", "pointerup", "click"]) {
  34 |       document.addEventListener(name, (event) => {
  35 |         const button = (event.target as Element)?.closest("button");
  36 |         if (button?.textContent?.includes("Cerrar sesión")) console.log(`[logout-event] ${name}`);
  37 |       }, true);
  38 |     }
  39 |   });
  40 |   await page.getByRole("button", { name: "Abrir menú" }).click();
  41 |   const logout = page.getByRole("button", { name: "Cerrar sesión", exact: true });
  42 |   await expect(logout).toBeVisible();
  43 |   await logout.click({ delay: 250 });
  44 |   try {
  45 |     await expect(page).toHaveURL(`${enabledBaseUrl}/`, { timeout: 10_000 });
  46 |     await page.goto(`${enabledBaseUrl}/editor`);
  47 |     await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  48 |     expect(logoutResponses).toContain(204);
  49 |     await login(page, enabledBaseUrl);
  50 |     sameStoredData(await snapshot(page), before);
  51 |   } finally {
  52 |     console.log(JSON.stringify({ events, logoutResponses, url: page.url(), expectedProfileId: before.profile.id }));
  53 |   }
  54 | });
  55 | 
```