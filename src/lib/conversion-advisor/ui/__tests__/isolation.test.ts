/**
 * CRIPQER Conversion Advisor — CA-7.4-B · the isolation guarantees, read off the
 * source.
 *
 * These are properties of the FILES, not of a run: a surface can behave
 * perfectly and still contain the one line that calls `fetch`, imports the
 * provider or reads an API key. So this test reads every production file in
 * `ui/` and refuses the tokens that would break the brief's transport rules.
 *
 * COMMENTS ARE STRIPPED FIRST, and that is not a detail. These files' own doc
 * comments name `fetch`, `process.env`, `createServerFn` and
 * `dangerouslySetInnerHTML` in order to explain why they are absent — a naive
 * scan would find those words in the prose and report a violation that does not
 * exist. The stripping is itself proved: the stripped source must contain no
 * comment opener and must still contain code.
 *
 * WHAT IS NOT SCANNED, AND WHY. Only the production files are read; the test
 * files beside them are not, because the sanctioned way to exercise this surface
 * end to end is to run the REAL pipeline (CA-7.1B → CA-8 → CA-3 → CA-4) from a
 * Node/happy-dom test — which necessarily imports server modules there, and
 * nowhere near the bundle. The guarantee this file defends is about what ships.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const UI_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Every production file of CA-7.4-B. Nothing under `__tests__` is included. */
const PRODUCTION_FILES = [
  "types.ts",
  "conversation-controller.ts",
  "useAdvisorConversation.ts",
  "AdvisorMessage.tsx",
  "AdvisorStatus.tsx",
  "AdvisorConversation.tsx",
] as const;

const SOURCES: ReadonlyMap<string, string> = new Map(
  PRODUCTION_FILES.map((file) => [file, readFileSync(join(UI_DIR, file), "utf8")]),
);

/**
 * Removes block and line comments.
 *
 * The `[^:]` guard before `//` is what keeps `https://` inside a string literal
 * from being treated as the start of a comment. There are no such literals in
 * these files — that is itself asserted below — and the guard makes the stripper
 * safe if one is ever added.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/gm, "$1");
}

const STRIPPED: ReadonlyMap<string, string> = new Map(
  [...SOURCES].map(([file, source]) => [file, stripComments(source)]),
);

function importSpecifiers(source: string): readonly string[] {
  return [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1] ?? "");
}

describe("the comment stripper itself", () => {
  it("really removes the comments, and really keeps the code", () => {
    for (const [file, stripped] of STRIPPED) {
      // If stripping had silently done nothing, the first assertion fails; if it
      // had eaten the file, the second does.
      expect(stripped, `${file} still contains a comment`).not.toContain("/*");
      expect(stripped, `${file} still contains a line comment`).not.toMatch(/(^|[^:])\/\//m);
      expect(stripped, `${file} lost its code`).toContain("export");
    }
  });
});

describe("the transport rules, as a property of the source", () => {
  it.each(PRODUCTION_FILES)("%s reaches no network, no storage and no environment", (file) => {
    const source = STRIPPED.get(file) ?? "";
    const forbidden = [
      "fetch(",
      "XMLHttpRequest",
      "WebSocket",
      "EventSource",
      "sendBeacon",
      "process.env",
      "import.meta.env",
      "createServerFn",
      "localStorage",
      "sessionStorage",
      "indexedDB",
      "document.cookie",
    ];
    for (const token of forbidden) {
      expect(source, `${file} must not contain ${token}`).not.toContain(token);
    }
  });

  it.each(PRODUCTION_FILES)("%s renders no HTML and evaluates no string", (file) => {
    const source = STRIPPED.get(file) ?? "";
    for (const token of [
      "dangerouslySetInnerHTML",
      "innerHTML",
      "outerHTML",
      "eval(",
      "new Function",
    ]) {
      expect(source, `${file} must not contain ${token}`).not.toContain(token);
    }
  });

  it.each(PRODUCTION_FILES)("%s can neither navigate nor open anything", (file) => {
    const source = STRIPPED.get(file) ?? "";
    for (const token of [
      "href=",
      "<a ",
      "window.open",
      "location.assign",
      "location.href",
      "history.push",
    ]) {
      expect(source, `${file} must not contain ${token}`).not.toContain(token);
    }
  });

  it.each(PRODUCTION_FILES)("%s carries no credential and no provider URL", (file) => {
    const source = STRIPPED.get(file) ?? "";
    for (const token of [
      "sk-",
      "apiKey",
      "api_key",
      "Authorization",
      "Bearer ",
      "http://",
      "https://",
    ]) {
      expect(source, `${file} must not contain ${token}`).not.toContain(token);
    }
  });

  it.each(PRODUCTION_FILES)("%s has no field for a session identifier", (file) => {
    const source = STRIPPED.get(file) ?? "";
    for (const token of ["session_id", "sessionId", "conversationId"]) {
      expect(source, `${file} must not contain ${token}`).not.toContain(token);
    }
  });

  it.each(PRODUCTION_FILES)("%s imports no server-only module", (file) => {
    const source = STRIPPED.get(file) ?? "";
    const specifiers = importSpecifiers(source);

    for (const specifier of specifiers) {
      expect(specifier, `${file} imports a server module`).not.toMatch(/\.server$/);
      expect(specifier, `${file} imports a server module`).not.toMatch(/\.server\./);
      expect(specifier, `${file} imports a Node builtin`).not.toMatch(/^node:/);
      for (const area of [
        "guardrails/",
        "session/",
        "preview/",
        "advisor/",
        "actions/",
        "capabilities/",
        "intents/",
      ]) {
        expect(specifier, `${file} imports ${area}`).not.toContain(area);
      }
    }
  });

  it.each(PRODUCTION_FILES)("%s imports nothing dynamically", (file) => {
    const source = STRIPPED.get(file) ?? "";
    // A dynamic import is the one way a forbidden module could be reached
    // without appearing in a specifier this test can read.
    expect(source, `${file} uses a dynamic import`).not.toMatch(/\bimport\s*\(/);
    expect(source, `${file} uses require`).not.toMatch(/\brequire\s*\(/);
  });
});

describe("the module graph, in full", () => {
  it("resolves to exactly the expected specifiers — no more, no fewer", () => {
    const specifiers = new Set<string>();
    for (const source of STRIPPED.values()) {
      for (const specifier of importSpecifiers(source)) specifiers.add(specifier);
    }

    expect([...specifiers].sort()).toEqual([
      "../integration/contract",
      "../integration/ui-contract",
      "../integration/ui-projection",
      "./AdvisorMessage",
      "./AdvisorStatus",
      "./conversation-controller",
      "./types",
      "./useAdvisorConversation",
      "react",
    ]);
  });

  it("takes every runtime dependency from inside CA-7.4-A, or from React", () => {
    for (const [file, source] of STRIPPED) {
      for (const specifier of importSpecifiers(source)) {
        const external = !specifier.startsWith(".");
        if (external) {
          expect(specifier, `${file} depends on ${specifier}`).toBe("react");
          continue;
        }
        // A relative import may leave the directory only to reach CA-7.4-A's own
        // pure modules — the three files it was built against, and nothing else.
        if (specifier.startsWith("../")) {
          expect([
            "../integration/contract",
            "../integration/ui-contract",
            "../integration/ui-projection",
          ]).toContain(specifier);
        }
      }
    }
  });

  it("never imports the landing, a route or another feature", () => {
    for (const [file, source] of STRIPPED) {
      for (const specifier of importSpecifiers(source)) {
        for (const forbidden of [
          "features/",
          "routes/",
          "components/",
          "../../../",
          "approved-chat-landing",
          "isolated/",
        ]) {
          expect(specifier, `${file} imports ${forbidden}`).not.toContain(forbidden);
        }
      }
    }
  });
});
