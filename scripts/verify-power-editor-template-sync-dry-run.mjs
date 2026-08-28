import { readFileSync } from "node:fs";

const path = process.argv[2] || "artifacts/power-editor-template-sync-dry-run.json";
const result = JSON.parse(readFileSync(path, "utf8"));

if (result.mode !== "dry-run") throw new Error(`Modo inesperado: ${result.mode}`);
if (result.templateCount !== 12) throw new Error(`Cantidad inesperada: ${result.templateCount}`);
if (!Array.isArray(result.blueprints) || result.blueprints.length !== 12)
  throw new Error("El plan no contiene doce blueprints.");
if (new Set(result.blueprints.map((item) => item.fingerprint)).size !== result.blueprints.length)
  throw new Error("El plan contiene fingerprints repetidos.");

console.log(`PASS sync dry-run: ${result.templateCount} blueprints únicos`);
