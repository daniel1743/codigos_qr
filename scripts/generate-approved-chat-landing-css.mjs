/**
 * Regenerates the scoped utility block of
 *   src/features/approved-chat-landing/styles/landing.css
 * from
 *   - the approved port source (src/features/approved-chat-landing/**.tsx)
 *   - the approved reference theme (tailwind.config.js of the Magic Patterns
 *     project, reproduced below verbatim)
 *
 * Why a generated block instead of a Tailwind entry / @theme tokens:
 * the host application compiles one Tailwind stylesheet (src/styles.css) and
 * several areas of the app already use class names such as "text-ink",
 * "bg-canvas", "border-line" or "hover:text-ink" (the Magic Editor and the
 * premium editor). Registering the reference tokens globally would change
 * those areas. Every rule emitted here is therefore scoped under
 * ".cripqer-chat-landing" (the port root) and cannot affect anything else.
 *
 * Usage:  node scripts/generate-approved-chat-landing-css.mjs
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const { compile } = require("@tailwindcss/node");
const { Scanner } = require("@tailwindcss/oxide");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const portDir = path.join(root, "src", "features", "approved-chat-landing");
const cssFile = path.join(portDir, "styles", "landing.css");

const ROOT_SELECTOR = ".cripqer-chat-landing";
const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);
const START = "/* >>> GENERATED:REFERENCE-SCOPED-UTILITIES";

/** Reference tailwind.config.js theme (Magic Patterns approved project), verbatim. */
const REFERENCE_THEME = `
@theme {
  --color-canvas: #FAFAF7;
  --color-ink: #0F1A2E;
  --color-muted: #5B6475;
  --color-line: #E7E4DD;
  --color-subtle: #F2F0EB;
  --color-brand-blue: #0D4AA1;
  --color-brand-blue-deep: #0A3A80;
  --color-brand-blue-soft: #EAF0F9;
  --color-brand-gold: #D4AF37;
  --color-brand-gold-soft: #F7EDCB;
  --font-display: Montserrat, system-ui, sans-serif;
  --font-sans: Inter, system-ui, sans-serif;
}
`;

function scanCandidates() {
  const scanner = new Scanner({
    sources: [{ base: portDir, pattern: "**/*.{ts,tsx}", negated: false }],
  });
  return scanner.scan();
}

/** Splits a selector list on top-level commas (ignores commas inside (), [] and strings). */
function splitSelectors(list) {
  const out = [];
  let depth = 0;
  let quote = null;
  let current = "";
  for (let i = 0; i < list.length; i += 1) {
    const ch = list[i];
    if (quote) {
      current += ch;
      if (ch === BS) {
        current += list[i + 1] ?? "";
        i += 1;
      } else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "(" || ch === "[") depth += 1;
    if (ch === ")" || ch === "]") depth -= 1;
    if (ch === "," && depth === 0) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

function prefixSelectorList(list) {
  return splitSelectors(list)
    .map((raw) => {
      const sel = raw.trim();
      if (!sel) return sel;
      if (sel.startsWith(ROOT_SELECTOR)) return sel;
      return ROOT_SELECTOR + " " + sel;
    })
    .join(", ");
}

/** Walks top-level CSS blocks, giving (prelude, body) pairs. */
function parseBlocks(css) {
  const blocks = [];
  let i = 0;
  while (i < css.length) {
    const brace = css.indexOf("{", i);
    const semi = css.indexOf(";", i);
    if (brace === -1) {
      const rest = css.slice(i).trim();
      if (rest) blocks.push({ prelude: rest, body: null });
      break;
    }
    if (semi !== -1 && semi < brace) {
      const prelude = css.slice(i, semi).trim();
      if (prelude) blocks.push({ prelude, body: null });
      i = semi + 1;
      continue;
    }
    const prelude = css.slice(i, brace).trim();
    let depth = 1;
    let j = brace + 1;
    let quote = null;
    while (j < css.length && depth > 0) {
      const ch = css[j];
      if (quote) {
        if (ch === BS) j += 1;
        else if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      j += 1;
    }
    blocks.push({ prelude, body: css.slice(brace + 1, j - 1) });
    i = j;
  }
  return blocks;
}

function scopeInner(css) {
  return parseBlocks(css)
    .map(({ prelude, body }) => {
      if (body === null) return prelude.endsWith(";") ? prelude : prelude + ";";
      const nested =
        prelude.startsWith("@media") ||
        prelude.startsWith("@supports") ||
        prelude.startsWith("@container") ||
        prelude.startsWith("@layer") ||
        prelude.startsWith("@scope") ||
        prelude.startsWith("@starting-style");
      if (nested) {
        const NL = String.fromCharCode(10);
        const walk = (src) =>
          parseBlocks(src)
            .map(({ prelude: p, body: b }) => {
              if (b === null) return "  " + p + ";";
              if (p.startsWith("@media") || p.startsWith("@supports")) {
                return "  " + p + " {" + NL + walk(b) + NL + "  }";
              }
              return "  " + prefixSelectorList(p) + " {" + NL + b.trim() + NL + "  }";
            })
            .join(NL);
        return prelude + " {" + NL + walk(body) + NL + "}";
      }
      if (
        prelude.startsWith("@keyframes") ||
        prelude.startsWith("@property") ||
        prelude.startsWith("@font-face") ||
        prelude.startsWith("@import")
      ) {
        return prelude + " {" + body + "}";
      }
      return prefixSelectorList(prelude) + " {" + body.trim() + "}";
    })
    .join(NL + NL);
}

function buildScopedUtilities() {
  const candidates = scanCandidates();
  const css = '@import "tailwindcss";' + NL + REFERENCE_THEME;
  return compile(css, { base: root, onDependency() {} }).then((compiler) => {
    const output = compiler.build(candidates);
    const blocks = parseBlocks(output);
    const parts = [];
    for (const block of blocks) {
      if (block.body === null) continue; // "@layer properties;", "@layer theme, base, ...;"
      if (block.prelude === "@layer utilities") {
        parts.push(scopeInner(block.body));
      } else if (block.prelude === "@layer theme") {
        parts.push(scopeInner(block.body.replaceAll(":root, :host", ROOT_SELECTOR)));
      } else if (block.prelude.startsWith("@keyframes") || block.prelude.startsWith("@property")) {
        parts.push(block.prelude + " {" + block.body + "}");
      }
      // "@layer base" (host preflight) and "@layer properties" (host emits the
      // same fallbacks) are intentionally dropped.
    }
    return parts.join(NL + NL);
  });
}

const generated = await buildScopedUtilities();

const current = readFileSync(cssFile, "utf8");
const head = current.slice(0, current.indexOf(START)).trimEnd();
const next =
  head +
  NL +
  NL +
  START +
  NL +
  " * Generated by scripts/generate-approved-chat-landing-css.mjs - do not edit by hand." +
  NL +
  " * Scoped under " +
  ROOT_SELECTOR +
  " ; nothing outside the port is affected. */" +
  NL +
  generated.trim() +
  NL +
  "/* <<< GENERATED:REFERENCE-SCOPED-UTILITIES <<< */" +
  NL;
writeFileSync(cssFile, next);
console.log("landing.css regenerated:", next.length, "bytes; candidates:", scanCandidates().length);
