import { test, expect } from "@playwright/test";
import { login, qaRequest, QA_PROFILE_ID, snapshot, captureBaseline } from "./helpers/phase6-qa";

const enabledBaseUrl = "http://localhost:8081";
const disabledBaseUrl = "http://localhost:8082";

let originalSnapshot;

test.describe("Onboarding V2 Existing User Invite", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, enabledBaseUrl);
    // Just clear the invite status for a clean run
    await qaRequest(page, "rest/v1/profiles?id=eq.${QA_PROFILE_ID}", "PATCH", {
      template_config: {}
    });
    originalSnapshot = await snapshot(page);
    captureBaseline(originalSnapshot);
    await page.goto(enabledBaseUrl); // Reset after login
  });

  test.afterEach(async ({ page }) => {
    // Ensure we don't break subsequent tests
    await page.goto(enabledBaseUrl);
    await qaRequest(page, "rest/v1/profiles?id=eq.${QA_PROFILE_ID}", "PATCH", {
      template_config: originalSnapshot?.profile?.template_config || {}
    });
  });

  test("shows invite modal, accepts, and navigates to onboarding", async ({ page }) => {
    await page.goto("${enabledBaseUrl}/editor");
    
    // Should see the modal
    const modalHeading = page.getByRole("heading", { name: "Nuevo Onboarding disponible", exact: true });
    await expect(modalHeading).toBeVisible({ timeout: 10_000 });
    
    // Accept the invite
    await page.getByRole("button", { name: "Probar ahora" }).click();
    
    // Should navigate to onboarding
    await expect(page).toHaveURL(/.*\/onboarding-preview.*/, { timeout: 10_000 });
    
    // Reloading editor directly should NOT show modal again
    await page.goto("${enabledBaseUrl}/editor");
    await expect(modalHeading).toHaveCount(0);
  });

  test("shows invite modal, declines, and stays on editor", async ({ page }) => {
    await page.goto("${enabledBaseUrl}/editor");
    
    // Should see the modal
    const modalHeading = page.getByRole("heading", { name: "Nuevo Onboarding disponible", exact: true });
    await expect(modalHeading).toBeVisible({ timeout: 10_000 });
    
    // Decline the invite
    await page.getByRole("button", { name: "Ahora no" }).click();
    
    // Should stay on editor
    await expect(page).toHaveURL(/.*\/editor.*/);
    await expect(modalHeading).toHaveCount(0);
    
    // Reloading editor directly should NOT show modal again
    await page.reload();
    await expect(modalHeading).toHaveCount(0);
  });
  
  test("never shows invite modal when flag is off", async ({ page }) => {
    // Need to login to disabled base url
    await login(page, disabledBaseUrl);
    
    // Should NOT see the modal
    const modalHeading = page.getByRole("heading", { name: "Nuevo Onboarding disponible", exact: true });
    await expect(modalHeading).toHaveCount(0);
  });
});
