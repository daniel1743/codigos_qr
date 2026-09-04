import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "dual-editor-persistence.spec.ts",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.QA_BASE_URL ?? "http://localhost:8080",
    headless: true,
  },
});
