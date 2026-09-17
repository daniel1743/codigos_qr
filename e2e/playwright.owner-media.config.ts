import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "owner-media-live-upload.spec.ts",
  timeout: 240_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.QA_BASE_URL ?? "http://localhost:8080",
    headless: true,
  },
});
