import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "onboarding-v2-phase5.spec.ts",
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.QA_BASE_URL ?? "http://localhost:8080",
    actionTimeout: 15_000,
    headless: true,
  },
});
