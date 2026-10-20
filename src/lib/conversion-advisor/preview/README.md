# CA-7.3A — the isolated conversational preview

An independent preview surface for the Conversion Advisor, built **inside** the
authorised module and **mounted nowhere**. It exists to prove a complete journey
— a visitor message in, a visible response out — without touching the landing,
without adding a route, and without a single call to a real provider.

## What it is

| File | Kind | Role |
| --- | --- | --- |
| `view-model.ts` | pure | The security boundary. `TurnOutcome` → what a surface may SHOW. |
| `render.ts` | pure | `PreviewMessage[]` → a plain-text transcript and a self-contained HTML page. |
| `harness.server.ts` | server-only | Drives one conversation through the REAL pipeline with a MOCK transport. |
| `__tests__/harness.test.ts` | test | The journey, the guard, the isolation, and the E2E. |
| `__tests__/view-model.test.ts` | test | The projection and the renderer in isolation. |
| `__tests__/boundaries.test.ts` | test | Source-level proofs: purity, no `process.env`, mounted nowhere. |

The pipeline the harness runs is not reimplemented anywhere:

```
runConversationalTurn   (CA-7.1B — reserves CA-8, calls CA-3 and CA-4)
  → adaptAdvisorToAgentResponse   (CA-7.2)
  → preview view model   (this directory)
```

There is no second classifier, no second advisor, no copy of the catalog and no
second memory. CA-6's session store **is** the memory, CA-8's guard **is** the
budget, CA-5's allowlist **is** the only thing that could decide an action.

## How to run the tests

From the worktree root:

```bash
# The preview suite alone (61 tests, ~2 s).
npx vitest run src/lib/conversion-advisor/preview

# One file, verbose.
npx vitest run src/lib/conversion-advisor/preview/__tests__/harness.test.ts --reporter=verbose

# The whole module, including the 260-test pre-CA-7.3A baseline.
npx vitest run src/lib/conversion-advisor
```

Every test is offline. The only mock is the provider **transport**
(`fetchImpl`); a test asserts that the global `fetch` is never called.

## How to see the preview by hand

The harness is a plain function, so a scratch script (or a temporary test) is
enough — no route, no dev server, no build step:

```ts
import { createPreviewHarness, makeClock } from "./src/lib/conversion-advisor/preview/harness.server";
import { renderTranscriptText, renderTranscriptHtml } from "./src/lib/conversion-advisor/preview/render";

const harness = createPreviewHarness({
  // A scripted transport: first the CA-3 listening answer, then the CA-4 reply.
  providerDeps: { fetchImpl: myScriptedFetch, now: makeClock(), sleep: async () => {} },
  now: makeClock(),
});

await harness.send("Vendo tortas por encargo.");
console.log(renderTranscriptText(harness.messages()));   // a readable transcript
// renderTranscriptHtml(...) returns a complete, self-contained HTML document.
```

`createPreviewHarness` defaults to a **fictional** configuration
(`FICTIONAL_PREVIEW_CONFIG`: an obviously fake key against a `.invalid` host),
so a wiring mistake still cannot reach a real provider. It never reads
`process.env`, and it never calls `getAdvisorGuard()` — the process-wide guard
whose limits are fixed from the real environment.

## What the preview may show

A status per message — `PROCESSING`, `ANSWERED`, `FALLBACK`, `DEGRADED`,
`REFUSED` — and, when there is one, a short comprehensible note. The note is
**total**: any internal reason the mapping does not recognise falls to a generic
sentence, so no diagnostic can leak by omission. The internal vocabulary
(`GUARD_DENIED`, `BUDGET_EXHAUSTED`, `PROVIDER_TIMEOUT`, …) never reaches the
surface.

The preview presents **no executable action**, ever. `actions` is `[]` on every
message, the renderer emits no anchor, button, form, script or image, and no
destination is invented.

## Deliberately out of scope

Not mounted on any route; the landing, the routes and the 12 models are
untouched; no real DeepSeek call; no paid API; no remote write; no database; no
new dependency. The next phase (CA-7.3B) is where a mounted surface would be
considered, with its own authorisation.
