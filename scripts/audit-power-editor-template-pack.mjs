import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { auditTemplates } from "./power-editor-template-factory.mjs";

const input = resolve(
  process.cwd(),
  process.argv[2] || "artifacts/power-editor-template-pack.json",
);
const pack = JSON.parse(readFileSync(input, "utf8"));
const audit = auditTemplates(pack.templates ?? []);
console.log(JSON.stringify(audit, null, 2));
if (!audit.pass) process.exitCode = 1;
