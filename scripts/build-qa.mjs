/** Builds the client in development mode with QA Supabase variables only. */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const QA_REF = "tjigzcyoogmvdkivypym";
const values = {};
for (const line of readFileSync(resolve(process.cwd(), ".env.qa"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
  if (match) values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
}
const ref = values.VITE_SUPABASE_URL?.match(/^https?:\/\/([a-z0-9]{20})\.supabase\.co\/?$/i)?.[1];
if (ref !== QA_REF || values.QA_PROJECT_REF !== QA_REF) {
  throw new Error(`HARD FAIL: build:dev requires QA ref ${QA_REF}; resolved ${ref ?? "unknown"}.`);
}
for (const name of ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]) {
  if (!values[name]) throw new Error(`HARD FAIL: .env.qa is missing ${name}.`);
}
values.VITE_APP_URL ||= "http://localhost:8080";
const env = { ...process.env, ...values };
delete env.SUPABASE_SERVICE_ROLE_KEY;
delete env.VITE_SUPABASE_SERVICE_ROLE_KEY;
console.log(`[BUILD_ENV] Supabase ref: ${ref}`);
const command = process.execPath;
const viteBin = resolve(process.cwd(), "node_modules/vite/bin/vite.js");
const result = spawnSync(command, [viteBin, "build", "--mode", "development"], {
  cwd: process.cwd(), env, stdio: "inherit",
});
process.exit(result.status ?? 1);
