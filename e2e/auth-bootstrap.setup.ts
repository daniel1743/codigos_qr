import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { expect, test as setup } from "@playwright/test";

const storageState = resolve("e2e/.auth/qa-storage-state.json");

setup("manual login and save local auth state", async ({ page }) => {
  setup.setTimeout(10 * 60 * 1000);
  await page.goto("/editor");

  // The user completes the real login in the visible browser window.
  // We only continue after an authenticated editor surface is observable.
  await expect(
    page.getByRole("button", { name: /Guardar|Publicar|Exportar/ }).first(),
  ).toBeVisible({ timeout: 9 * 60 * 1000 });

  await mkdir(dirname(storageState), { recursive: true });
  await page.context().storageState({ path: storageState });
  console.log("[AUTH_BOOTSTRAP] authenticated surface verified; local storageState saved");
});
