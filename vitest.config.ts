import { defineConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default defineConfig(async ({ command, mode }) => {
  const base = await (viteConfig as unknown as (env: unknown) => unknown)({
    command,
    mode,
    isSsrBuild: false,
  });

  return {
    ...(base as object),
    test: {
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.staging/**",
        // CONV-02 — browser E2E belongs to Playwright. Vitest's default include
        // matches `*.spec.ts`, so without this a unit run would try to launch the
        // browser suites.
        "e2e/**",
        "**/*.spec.ts",
        // CONV-02 — a Playwright suite that boots a real browser, even though
        // it is named `.test.tsx`. It belongs to the browser run, not the unit
        // default; its console-error assertion also sees the Vite dev server's
        // HMR socket, which is not a product assertion.
        "**/*browser-e2e.test.tsx",
        // CONV-02 — a real-provider evaluation run spends money and is only ever
        // started through the campaign scripts with an injected transport (and
        // now refuses without one). It must never be swept into `npm run test`.
        "**/*.real-provider.test.ts",
        "**/*.live.test.ts",
      ],
    },
  };
});
