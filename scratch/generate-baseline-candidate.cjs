#!/usr/bin/env node
/**
 * Generates the review-only baseline candidate from the authoritative live dump.
 * Read-only: does not touch the remote database, migrations, or ledger.
 *
 * Strips pg_dump "noise" only:
 *   - TOC entry / Name / Type / Schema / Owner / Dependencies comment blocks
 *   - header/footer boilerplate (PostgreSQL/Dumped/Started/Completed comments)
 *   - session SET statements (re-inserts only the required check_function_bodies)
 *   - \restrict encryption marker
 *   - search_path set_config call
 *   - ALTER ... OWNER TO ... (environment-specific ownership)
 *
 * Preserves everything structural: tables, columns/defaults/nullability,
 * constraints, indexes, RLS, policies, functions, triggers, views, COMMENT ON,
 * and GRANT statements.
 */
const fs = require('fs');

const INPUT = 'scratch/cripqer-live-schema-raw.sql';
const OUTPUT = 'scratch/cripqer-production-baseline-candidate.sql';

const lines = fs.readFileSync(INPUT, 'utf8').split(/\r?\n/);

const TOC_COMMENT = /^-- (TOC entry|Dependencies|Name:|Type:|Schema:|Owner:|PostgreSQL|Dumped|Started|Completed)/;
const LONE_DASH = /^--\s*$/;

const PREAMBLE = [
  '-- =============================================================================',
  '-- Cripqer Production Baseline Candidate (REVIEW-ONLY)',
  '--',
  '-- Source : scratch/cripqer-live-schema-raw.sql (pg_dump --schema-only, PG 17.6)',
  '-- Purpose: Recreate the CURRENT public structural contract on a fresh Supabase',
  '--          project where auth/storage already exist.',
  '--',
  '-- External dependencies (NOT included here):',
  '--   * auth schema (auth.users FKs, auth.uid(), auth.jwt())  -> Supabase-managed',
  '--   * pgcrypto extension (gen_random_uuid())               -> Supabase default',
  '--',
  '-- Deliberately ABSENT (matches live production truth):',
  '--   * claim_billing_event (missing in production)',
  '--   * any row data (no COPY / INSERT data)',
  '--',
  '-- Removed as environment/Supabase boilerplate (not part of the structural',
  '-- contract, re-established automatically on a fresh Supabase project):',
  '--   * ALTER ... OWNER TO ... statements',
  '--   * ALTER DEFAULT PRIVILEGES ... (supabase_admin/postgres defaults)',
  '--   * pg_dump TOC comments, session SET boilerplate, \\restrict/\\unrestrict',
  '-- =============================================================================',
  '',
  'SET check_function_bodies = false;',
  'SET search_path = public;',
  '',
  'CREATE SCHEMA IF NOT EXISTS public;',
];

const out = [];
let started = false;

for (const line of lines) {
  const t = line.trim();

  // Drop everything until the first CREATE SCHEMA (the pg_dump header block).
  if (!started) {
    if (t === 'CREATE SCHEMA public;') {
      started = true;
      continue; // we re-emit our own schema preamble above
    }
    continue;
  }

  // Drop \restrict / \unrestrict markers
  if (/^\\restrict\s/.test(t)) continue;
  if (/^\\unrestrict\s/.test(t)) continue;

  // Drop Supabase-standard default privileges (environment/Supabase boilerplate;
  // a fresh Supabase project re-establishes these automatically)
  if (/^ALTER DEFAULT PRIVILEGES\s/.test(t)) continue;

  // Drop session SET statements (re-added in preamble as needed)
  if (/^SET\s/.test(t)) continue;

  // Drop search_path set_config
  if (/^SELECT pg_catalog\.set_config/.test(t)) continue;

  // Drop ownership statements (environment-specific)
  if (/^ALTER\s.*\sOWNER\sTO\s/.test(t)) continue;

  // Drop TOC / header / footer boilerplate comments (column-0 comments)
  if (/^--/.test(line)) {
    if (LONE_DASH.test(line) || TOC_COMMENT.test(line)) continue;
    // retain any other column-0 comment defensively (none expected)
  }

  out.push(line);
}

// Trim trailing blank lines, ensure single trailing newline
while (out.length && out[out.length - 1].trim() === '') out.pop();

// Collapse runs of 2+ blank lines into a single blank line
const collapsed = [];
for (const line of out) {
  if (line.trim() === '') {
    if (collapsed.length && collapsed[collapsed.length - 1].trim() === '') continue;
  }
  collapsed.push(line);
}

// Trim leading/trailing blank lines from the collapsed output
while (collapsed.length && collapsed[0].trim() === '') collapsed.shift();
while (collapsed.length && collapsed[collapsed.length - 1].trim() === '') collapsed.pop();

const result = PREAMBLE.join('\n') + '\n' + collapsed.join('\n') + '\n';
fs.writeFileSync(OUTPUT, result, 'utf8');

// Quick structural counts for verification
const counts = {
  CREATE_TABLE: (result.match(/^CREATE TABLE/gm) || []).length,
  CREATE_FUNCTION: (result.match(/^CREATE FUNCTION/gm) || []).length,
  CREATE_POLICY: (result.match(/^CREATE POLICY/gm) || []).length,
  CREATE_INDEX: (result.match(/^CREATE (?:UNIQUE )?INDEX/gm) || []).length,
  CREATE_TRIGGER: (result.match(/^CREATE TRIGGER/gm) || []).length,
  CREATE_VIEW: (result.match(/^CREATE (?:OR REPLACE )?VIEW/gm) || []).length,
  ALTER_TABLE: (result.match(/^ALTER TABLE/gm) || []).length,
  OWNER_STATEMENTS: (result.match(/OWNER\sTO/gm) || []).length,
  COPY_DATA: (result.match(/^COPY /gm) || []).length,
  INSERT_DATA: (result.match(/^INSERT INTO/gm) || []).length,
  claim_billing_event: (result.match(/claim_billing_event/g) || []).length,
};

console.log(JSON.stringify(counts, null, 2));
console.log('Bytes written:', fs.statSync(OUTPUT).size);
