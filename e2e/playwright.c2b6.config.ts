import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "c2b6-analytics-visual-qa.spec.ts",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.QA_BASE_URL ?? "http://localhost:8080",
    headless: true,
  },
});
