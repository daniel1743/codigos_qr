import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  root,
  configFile: resolve(root, "vite.config.ts"),
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true },
});

try {
  const entrypoint = await server.ssrLoadModule(
    "/src/lib/parametric-engine-v2/internal-entrypoint.ts",
  );
  const result = entrypoint.generateCripqerPageWithEngineV2(
    {
      profession: "professional",
      goal: "contact",
      style: "natural",
      selectedFeatures: ["whatsapp", "instagram"],
      content: {
        name: "QA Dual Editor Test",
        bio: "Generated QA page for the dual editor persistence gate.",
        links: [
          { label: "WhatsApp", url: "https://wa.me/56911111111" },
          { label: "Instagram", url: "https://www.instagram.com/qa.dual.editor.test/" },
        ],
      },
      primaryAction: { type: "whatsapp", value: "56911111111" },
    },
    { now: "2026-09-03T00:00:00.000Z" },
  );
  process.stdout.write(JSON.stringify(result.editorConfig));
} finally {
  await server.close();
}
