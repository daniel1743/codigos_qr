import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "auth-bootstrap.setup.ts",
  timeout: 10 * 60 * 1000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.QA_BASE_URL ?? "http://localhost:8080",
    headless: false,
    ...devices["Desktop Chrome"],
  },
});
