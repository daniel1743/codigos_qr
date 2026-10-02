import { defineConfig, devices } from "@playwright/test";

/**
 * Real-browser QA for the Magic editor top bar ("Tipo de página" / "Variante").
 *
 * The lab route mounts the exact same MagicEditorApp the production host renders
 * at /pages/$pageId/edit, so popover geometry, stacking and CSS clipping are the
 * production ones.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "magic-page-family-variant.spec.ts",
  outputDir: "../logs/magic-page-selectors/playwright",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  workers: 1,
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL: process.env.MAGIC_QA_BASE_URL ?? "http://localhost:5199",
    headless: true,
    actionTimeout: 20_000,
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npx vite dev --force --port 5199 --strictPort",
    url: "http://localhost:5199/labs/magic-editor",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
