#!/usr/bin/env node
/**
 * Typecheck barrier — the gate that `vite build` cannot provide.
 *
 * WHY THIS EXISTS
 * `npm run build` runs esbuild, which strips types without checking them. Two
 * undeclared identifiers (`colStyle` in BusinessTemplate/PortfolioTemplate, `b`
 * in GenericBlock) shipped that way and would throw `ReferenceError` the moment
 * a user added a "Botón" or "Separador" block. A third pair (`TextField`,
 * `DivideIcon` in useSelectionActions) would have thrown when opening the review
 * and separator panels.
 *
 * WHY IT IS NOT A PLAIN `tsc --noEmit`
 * The repo carries ~1.7k pre-existing type errors, dominated by stylistic
 * strictness flags (`noPropertyAccessFromIndexSignature` alone accounts for ~640).
 * Gating on all of them is not achievable, and would require touching editor
 * lineages that are explicitly out of scope. What IS achievable — and what
 * actually caused the crashes — is a precise rule:
 *
 *     no undeclared identifiers in the Magic Editor path.
 *
 * TS2304 ("Cannot find name") and TS2552 ("Cannot find name, did you mean") are
 * exactly that class, and are independent of every strictness flag. Scope widens
 * as other lineages get cleaned; see GATED_SCOPES.
 *
 * SYNTAX-ERROR GUARD
 * A malformed file can make TypeScript skip its *entire* semantic pass: with one
 * corrupt file present this repo reported 2 diagnostics, and with it removed,
 * 1757. Left unguarded, this gate would pass vacuously whenever someone leaves
 * such a file behind — precisely the failure it exists to prevent.
 *
 * Not every TS1xxx does that, though. Measured on this repo:
 *   · TS1434 ("Unexpected keyword or identifier", from a garbage first line)  → suppresses
 *   · TS1117 ("object literal cannot have multiple properties")              → does NOT suppress
 * The 1746-diagnostic run below includes a pre-existing TS1117 and is complete.
 *
 * So the guard fails on every syntax-class error except a small, explicit
 * baseline of ones measured not to suppress. The baseline lives in
 * SYNTAX_BASELINE and is keyed by `file(line)code` so it cannot silently widen.
 */

import { execSync } from 'node:child_process';

/** Only these trees are gated. Widen as lineages are cleaned. */
const GATED_SCOPES = ['src/isolated/magic-page-editor/', 'src/features/magic-page-editor-production/'];

/** Undeclared-identifier diagnostics. */
const UNDECLARED = /error TS(2304|2552):/;
/** Any syntax-class diagnostic. */
const SYNTAX = /error TS1\d{3}:/;

/**
 * Syntax-class diagnostics that exist in the tree today and were measured NOT to
 * suppress the semantic pass. Out-of-scope lineage (premium-template-studio).
 * Key format: `<file>(<line>)<code>`. Remove an entry once its file is fixed.
 */
const SYNTAX_BASELINE = new Set([
  'src/premium-template-studio/components/blocks/PremiumProductCardMagicV1.tsx(366)1117',
]);

const syntaxKey = (line) => {
  const m = line.match(/^(.*)\((\d+),(\d+)\): error TS(\d+):/);
  return m ? `${m[1]}(${m[2]})${m[4]}` : line;
};

function runTsc() {
  try {
    return execSync('npx tsc --noEmit', {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    // tsc exits non-zero when it has diagnostics; that is the expected path.
    return `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
}

const output = runTsc();
const lines = output.split(/\r?\n/).filter((line) => /error TS\d+:/.test(line));

const inScope = (line) => GATED_SCOPES.some((scope) => line.includes(scope));

const syntaxAll = lines.filter((line) => SYNTAX.test(line));
const syntax = syntaxAll.filter((line) => !SYNTAX_BASELINE.has(syntaxKey(line)));
const syntaxBaselined = syntaxAll.length - syntax.length;
const undeclared = lines.filter((line) => UNDECLARED.test(line));
const undeclaredGated = undeclared.filter(inScope);
const undeclaredOutside = undeclared.filter((line) => !inScope(line));

console.log(`Diagnósticos totales del repo: ${lines.length}`);
console.log(`  · estilo/estrictez (fuera de alcance): ${lines.length - syntaxAll.length - undeclared.length}`);
console.log(`  · sintaxis:                            ${syntaxAll.length}  (${syntaxBaselined} en línea base)`);
console.log(`  · identificador no declarado:          ${undeclared.length}`);
console.log(`      en alcance vigilado:               ${undeclaredGated.length}`);
console.log(`      fuera de alcance:                  ${undeclaredOutside.length}`);
console.log('');

let failed = false;

if (syntax.length > 0) {
  console.error('FALLO — errores de sintaxis fuera de la línea base.');
  console.error('         Un archivo malformado puede hacer que TypeScript omita el análisis');
  console.error('         semántico completo, así que esta barrera no puede confiar en sí misma:\n');
  for (const line of syntax) console.error(`  ${line}`);
  console.error('');
  failed = true;
}

if (syntaxBaselined > 0) {
  console.warn(`NOTA — ${syntaxBaselined} error(es) de sintaxis en línea base. Medidos como NO supresores`);
  console.warn('       del análisis semántico; no bloquean esta barrera. Retirar la entrada al arreglar el archivo.\n');
}

if (undeclaredGated.length > 0) {
  console.error('FALLO — identificadores no declarados en el camino Magic Editor.');
  console.error('         Cada uno es un ReferenceError en render:\n');
  for (const line of undeclaredGated) console.error(`  ${line}`);
  console.error('');
  failed = true;
}

if (undeclaredOutside.length > 0) {
  console.warn('AVISO — identificadores no declarados FUERA del alcance vigilado');
  console.warn('        (linajes fuera de alcance; no bloquean esta barrera):\n');
  for (const line of undeclaredOutside) console.warn(`  ${line}`);
  console.warn('');
}

if (failed) {
  console.error('Barrera de typecheck: FALLO');
  process.exit(1);
}

console.log('Barrera de typecheck: OK');
console.log(`  · 0 errores de sintaxis`);
console.log(`  · 0 identificadores no declarados en ${GATED_SCOPES.length} alcance(s)`);
