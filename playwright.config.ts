import { defineConfig } from "@playwright/test";

/**
 * Playwright config — Template Factory (PASS C)
 *
 * Los tests del generador no necesitan el dev server: el renderer compartido
 * (`public/template-builder.html`) es un HTML standalone que se carga por
 * file://. Eso mantiene la suite ejecutable sin infraestructura.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    [
      "json",
      { outputFile: "artifacts/template-factory/pass-c-generator-v1/playwright-results.json" },
    ],
  ],
  use: {
    trace: "off",
    screenshot: "off",
  },
  projects: [
    {
      name: "template-factory",
      testMatch: /template-factory\/.*\.spec\.ts/,
    },
  ],
});
