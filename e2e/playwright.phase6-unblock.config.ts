import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "phase6-local-unblock.spec.ts",
  outputDir: "../logs/phase6-unblock/playwright",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: "line",
  use: { baseURL: "http://localhost:8080", headless: true, actionTimeout: 15_000 },
});
