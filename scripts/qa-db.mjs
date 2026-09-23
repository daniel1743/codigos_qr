/**
 * QA-only direct DB helper for CRIPQER analytics phase C2B2.
 *
 * Connects to the dedicated QA Supabase Postgres via the session pooler
 * using credentials from .env.qa. It NEVER touches the production project.
 * Usage:
 *   node scripts/qa-db.mjs --file path/to.sql
 *   node scripts/qa-db.mjs --sql "select 1"
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const { Client } = pg;

function loadEnv(path = ".env.qa") {
  const raw = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

export function createQaClient(envPath = ".env.qa") {
  const env = loadEnv(envPath);
  const ref = env.QA_PROJECT_REF;
  if (!ref || ref !== "tjigzcyoogmvdkivypym") {
    throw new Error(
      `Refusing to run QA DB helper: expected QA project tjigzcyoogmvdkivypym, got "${ref}".`,
    );
  }
  return new Client({
    host: "aws-0-us-east-1.pooler.supabase.com",
    port: 5432,
    database: "postgres",
    user: `postgres.${ref}`,
    password: env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });
}

const argv = process.argv.slice(2);
const fileFlag = argv.indexOf("--file");
const sqlFlag = argv.indexOf("--sql");

let sql = null;
if (fileFlag !== -1 && argv[fileFlag + 1]) {
  sql = readFileSync(argv[fileFlag + 1], "utf8");
} else if (sqlFlag !== -1 && argv[sqlFlag + 1]) {
  sql = argv[sqlFlag + 1];
}

if (!sql) {
  console.error('Usage: node scripts/qa-db.mjs --file <sql> | --sql "<sql>"');
  process.exit(1);
}

const client = createQaClient();
try {
  await client.connect();
  const result = await client.query(sql);
  if (result.command) {
    console.log(JSON.stringify({ command: result.command, rowCount: result.rowCount }));
  }
  if (result.rows?.length) {
    console.log(JSON.stringify(result.rows, null, 2));
  }
} finally {
  await client.end();
}
