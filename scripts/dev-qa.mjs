/** Start local Vite development against the production Supabase project. */
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const PROD_REF = "mlinfiuhkxdhlveflbkj";

function loadEnvFile(path) {
  const values = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (match) values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

const prodEnv = loadEnvFile(resolve(process.cwd(), ".env.local"));
const url = prodEnv.VITE_SUPABASE_URL ?? "";
const ref = url.match(/^https?:\/\/([a-z0-9]{20})\.supabase\.co\/?$/i)?.[1] ?? null;
if (ref !== PROD_REF) {
  throw new Error(`HARD FAIL: local dev requires production ref ${PROD_REF}; resolved ${ref ?? "unknown"}.`);
}
for (const name of ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]) {
  if (!prodEnv[name]) throw new Error(`HARD FAIL: .env.local is missing ${name}.`);
}
prodEnv.VITE_APP_URL ||= "http://localhost:8080";

const childEnv = { ...process.env, ...prodEnv };
delete childEnv.SUPABASE_SERVICE_ROLE_KEY;
delete childEnv.VITE_SUPABASE_SERVICE_ROLE_KEY;
console.log(`[DEV_ENV] Supabase production ref: ${ref}`);
console.log("[DEV_ENV] service-role variables are not passed to Vite.");

const command = process.execPath;
const viteBin = resolve(process.cwd(), "node_modules/vite/bin/vite.js");
const child = spawn(command, [viteBin, "dev", "--force", ...process.argv.slice(2)], {
  cwd: process.cwd(), env: childEnv, stdio: "inherit",
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
