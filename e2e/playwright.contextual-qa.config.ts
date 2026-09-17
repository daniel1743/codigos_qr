import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "contextual-media-authenticated.spec.ts",
  timeout: 240_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.QA_BASE_URL ?? "http://localhost:8080",
    storageState: "e2e/.auth/qa-storage-state.json",
    headless: true,
    ...devices["Desktop Chrome"],
  },
});
