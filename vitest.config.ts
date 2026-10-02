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
      exclude: ["**/node_modules/**", "**/dist/**", "**/.staging/**"],
    },
  };
});
