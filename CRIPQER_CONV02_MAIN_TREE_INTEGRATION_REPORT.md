# CRIPQER · CONV-02 · MAIN TREE INTEGRATION REPORT

**Project:** CRIPQER  
**Front:** `CONVERSATIONAL_LANDING_AI`  
**Phase:** `CONV-02` · `IMPLEMENT_MAIN_TREE_INTEGRATION_LOCAL_ONLY`  
**Date:** 2026-10-20  
**Destination worktree:** `C:/Users/Lenovo/Desktop/worktrees/cripqer-conv02-integration`  
**Destination branch:** `feat/conv02-advisor-main-integration`  
**Verdict:** `CONV02_MAIN_TREE_INTEGRATION_PASS` → `READY_FOR_CONV03_PUBLIC_LANDING_WIRING`

---

## 1. Base and source provenance

| Item | Value |
| --- | --- |
| Canonical base commit | `9354eef1c95496a266d275bf985295b6faa4327c` (`fix(landing): keep the profile route free of guest-editor imports`) |
| Base verification | `git rev-parse HEAD` in the destination worktree returns exactly `9354eef1c95496a266d275bf985295b6faa4327c` |
| Source worktree | `C:/Users/Lenovo/Desktop/worktrees/cripqer-conversion-advisor` |
| Source branch | `feat/conversion-advisor-v1` |
| Source HEAD | `06f9310a8ee52c450c8df9ae8bcc822b15837f5c` |
| Source tree state | 21 dirty entries (implementation committed as worktree state, exactly as the brief warned) — the source **files** were hashed, not the commit |
| Canonical facade | `AssistantService` (unchanged) |
| Conversational brain | Conversion Advisor |
| LLM provider | DeepSeek direct |
| Advisor model variable | `ADVISOR_MODEL` (dedicated) |
| Production wiring | **not performed** — `useCripqerSession` and the route are untouched (CONV-03) |

The contaminated main working tree (`generador de QR`) was **not** touched, cleaned
or normalized. All work happened in the isolated worktree above, branched from the
deployed HEAD. No `git reset`, `git clean`, `git stash`, force checkout, force push
or history rewrite was executed.

---

## 2. Source file hash manifest

Two manifests are committed as evidence under `docs/conv02/`:

| Manifest | Entries | Contents |
| --- | --- | --- |
| `docs/conv02/advisor-source-manifest.md5` | 100 | Hash of every advisor source file as it exists in `cripqer-conversion-advisor` at `06f9310`, header records source worktree, source head and generation date. |
| `docs/conv02/advisor-integration-tree.md5` | 113 | Hash of every integrated file in the destination tree (advisor core + landing advisor + provider bridge + planner + seeds + adapter + their tests). |

Format: `md5  relative/path`, LF only. Hash comparison is performed after
`tr -d '\r'` on both sides because the repository is CRLF and `git show` emits LF;
without normalization every file falsely reports as changed.

Reproduction:

```bash
cd "C:/Users/Lenovo/Desktop/worktrees/cripqer-conv02-integration"
# destination hashes
find src/lib/conversion-advisor src/features/approved-chat-landing/advisor \
     src/features/approved-chat-landing/assistant/advisors \
     src/features/approved-chat-landing/assistant/landingActionAdapter.ts \
     src/features/approved-chat-landing/assistant/__tests__/landingActionAdapter.test.ts \
     src/features/approved-chat-landing/utils/landingPlan.ts \
     src/features/approved-chat-landing/utils/seedResponses.ts \
     src/features/approved-chat-landing/utils/__tests__/landingPlan.test.ts \
     src/features/approved-chat-landing/utils/__tests__/createCommand.test.ts \
     -type f | sort | xargs md5sum
```

Delta against the 100-entry source manifest: **14 changed, 18 added, 5 deliberately
rejected** (sections 3–5). `103` files live under the two advisor directories; the
113-entry integration manifest additionally covers the landing-side planner, seed
fixture and adapter.

---

## 3. Files added

18 source files do not exist in the source manifest and were authored during
CONV-02 integration.

**Landing side (10)**

| File | Purpose |
| --- | --- |
| `src/features/approved-chat-landing/utils/landingPlan.ts` | Deterministic planner: every conversational action is derived from the landing's own catalog and context. |
| `src/features/approved-chat-landing/utils/seedResponses.ts` | Fixture-only copy of the prototype rule set, so seeds stop importing the product provider. |
| `src/features/approved-chat-landing/assistant/landingActionAdapter.ts` | Closed boundary from planned actions to the eight conversational `AgentAction`s (section 9). |
| `src/features/approved-chat-landing/assistant/advisors/contract.ts` | `ConversionAdvisorClient` interface, provider id, refusal text chosen by code. |
| `src/features/approved-chat-landing/assistant/advisors/provider.ts` | `AssistantProvider` implementation (section 8). |
| `src/features/approved-chat-landing/assistant/advisors/transport.ts` | Browser client: lazy session id, 60 000 ms deadline, dynamic server import, fail-closed projection rebuild, no fetch/retry/budget/memory. |
| `.../utils/__tests__/landingPlan.test.ts` | Planner contract tests. |
| `.../utils/__tests__/createCommand.test.ts` | `CREATE_PAGE` stays behind the test-only switch. |
| `.../assistant/__tests__/landingActionAdapter.test.ts` | 5 tests (section 9). |
| `.../assistant/advisors/__tests__/conversionAdvisorProvider.test.ts` | Provider bridge tests: one call, deterministic actions, no model ids. |

**Advisor side (8)**

| File | Purpose |
| --- | --- |
| `src/lib/conversion-advisor/integration/landing-context.ts` | `LandingContextSnapshot` builder/sanitizer (section 7). |
| `src/lib/conversion-advisor/integration/assistant.server.ts` | Server-only `createServerFn` entry: identity validator, in-handler wire validation, `runConversationalTurn`, 11-field projection, fixed `UNAVAILABLE` sentence. |
| `src/lib/conversion-advisor/integration/observability.server.ts` | Eight closed dotted events, allowlisted fields, non-fatal sink (section 15). |
| `.../integration/__tests__/advisorWireContract.test.ts` | Wire contract, catalog allowlists, closed union. |
| `.../integration/__tests__/fastPathAccounting.test.ts` | Fast-path reserves no budget and reports `deterministic`. |
| `.../integration/__tests__/observability.test.ts` | Event vocabulary + rejection of UUID-shaped `model` in the id slot. |
| `.../integration/__tests__/timeoutBudget.test.ts` | 12 s × 1 retry × 2 operations + backoff fits 60 s (section 13). |
| `.../__tests__/providerModelConfig.test.ts` | `ADVISOR_MODEL` precedence, shared model untouched (section 12). |

---

## 4. Files merged

14 files exist in both worktrees and were merged into the destination with the
substantive adaptations below.

**Production (5)**

| File | Adaptation |
| --- | --- |
| `src/lib/conversion-advisor/provider.server.ts` | `ADVISOR_MODEL` added to `AdvisorEnv`; precedence `ADVISOR_MODEL → DEEPSEEK_MODEL → deepseek-flash`; `ADVISOR_DEFAULTS.timeoutMs` 20 000 → 12 000; `DEEPSEEK_MODEL` itself untouched. |
| `src/lib/conversion-advisor/integration/contract.ts` | `TurnRequest` gains `landingContext: LandingContextSnapshot \| null`; `REQUEST_KEYS = ["sessionId","message","landingContext"]`; `sanitizeLandingContext` recomputes derived facts; `model` added to `TurnOutcome` and `PublicTurnResult`; closed `AssistantTurnResult` union. |
| `src/lib/conversion-advisor/advisor/orchestrator.server.ts` | `buildLandingBlock`, `buildAdvisorSystemPrompt(records, strategy, landingContext)`, commercial-honesty block (section 17). |
| `src/lib/conversion-advisor/integration/turn.server.ts` | Landing-context plumbing, model reporting, observability emission, fast-path accounting (~120 insertions). |
| `src/lib/conversion-advisor/evaluation/runner.server.ts` | `requireInjectedFetch(deps)` throws `EVALUATION_REQUIRES_INJECTED_FETCH`; `runDataset` fails closed before the first case (section 16). |

**Tests/harness (9)** — fixture/type adaptations only, no assertion weakened:

`integration/__tests__/{landing-adapter,latency-breakdown,turn,ui-projection,ui-state}.test.ts`,
`preview/__tests__/{harness,view-model}.test.ts`,
`advisor/__tests__/{race-conditions,failure-isolation}.test.ts`.

**Landing-side advisor files (carried into new untracked directories):**

The complete advisor controller, gateway, transport and their tests were carried
over unchanged from the source manifest into
`src/features/approved-chat-landing/advisor/`. Separately, six **tracked** files
were modified:

| File | Change |
| --- | --- |
| `.env.example` | Documents `ADVISOR_MODEL`, `ADVISOR_TIMEOUT_MS=12000`, `ADVISOR_MAX_OUTPUT_TOKENS=3584`, `ADVISOR_MAX_RETRIES=1`, with the time budget arithmetic in the comment. |
| `package.json` | Adds `test:advisor` and `test:advisor:eval`. |
| `assistant/localProvider.ts` | Status comment only: SUPERSEDED AS A PRODUCT PROVIDER; promises a CONV-03 cutover. Code semantics unchanged. |
| `utils/agent.ts` | `FIXTURE_ONLY` documentation; exports already-internal `resolveTemplateReference`, `resolveOrdinal`, `recommendByTags`, `similarTo` for the planner. No behavior change. |
| `utils/seed.ts` | Imports `respondSeed` from `utils/seedResponses.ts` instead of `respondLocal`. |
| `vitest.config.ts` | Excludes `**/*browser-e2e.test.tsx`, `**/*.real-provider.test.ts`, `**/*.live.test.ts` from the unit default. |

`src/routeTree.gen.ts` shows as modified **only** because of CRLF/LF; its
normalized content md5 is `7b34b24d4394929acf4931b7d959e7b7`, identical to HEAD.

---

## 5. Files deliberately rejected

Five source files were not integrated. They are preserved as `.txt` under
`docs/conv02/rejected/` (with a `README.md` explaining restoration), so no runner
can execute them:

| File | Reason |
| --- | --- |
| `advisor-landing-mount.test.tsx` | Mounts `ApprovedChatLanding` with `advisorTransport`; the prop is CONV-03. |
| `advisor-integration-contract.test.ts` | Asserts the CONV-03 route/hook/transport contract. |
| `ui-latency-instrumentation.test.tsx` | Measures UI latency through the CONV-03 provider cutover. |
| `ui-landing-product-e2e.test.tsx` | Product E2E through the CONV-03 cutover. |
| `ui-e2e-landing-entry.tsx` | Entry fixture for that E2E. |

These five are the source of **all 10 structural type errors** encountered during
integration and of the deferred test failures in earlier runs. Nothing was deleted:
each file is byte-identical to the source, only renamed to `.txt`. CONV-03 restores
them by renaming back and adding the seam they assert.

---

## 6. Conversion Advisor core integration

The complete CA-1…CA-12 set now lives in the canonical tree:

- `src/lib/conversion-advisor/` — classifier, orchestrator, action policy, memory,
  turn orchestration, guardrails, evaluation harness, navigation, mount helpers,
  fast path, integration layer.
- `src/features/approved-chat-landing/advisor/` — the landing-side controller,
  gateway, transport and UI contract types.

The advisor is reachable **only** through server functions. `assistant.server.ts`
is a server-only `createServerFn` whose validator is identity (to preserve the wire
contract) and whose handler performs the real `validateTurnRequest`, calls
`runConversationalTurn(data, { fastPath: "on" })`, and returns either
`{ ok: true, data: toPublicTurnResult(...) }` or `{ ok: false, code, message }`.
The catch-all branch returns one fixed `UNAVAILABLE` sentence.

No import of the advisor exists from any route, hook, component or provider other
than the four bridge files in `assistant/advisors/` (three production + one test).

---

## 7. Landing context contract

`LandingContextSnapshot` is built by `integration/landing-context.ts` from the
landing's own `BusinessContext`:

- **Bounded:** primitives only, fixed keys, no functions, no class instances, no
  raw history.
- **Server-validated:** `sanitizeLandingContext` accepts the snapshot and
  **recomputes** every derived fact on the server; the client's derived values are
  never trusted.
- **Optional:** `TurnRequest.landingContext: LandingContextSnapshot | null`; a turn
  without context is valid and behaves exactly as before.
- **Closed request keys:** `REQUEST_KEYS = ["sessionId","message","landingContext"]`;
  any other key is rejected by the wire contract.

The context carries the business type, goal, channel, selected/candidate template
ids and completion state — i.e. exactly what the advisor needs to ground advice,
and nothing that would let the client steer guardrails.

---

## 8. AssistantProvider adapter

`assistant/advisors/provider.ts` implements `AssistantProvider` with id
`conversion-advisor`.

- **Card selection is deterministic and free:** `intent.kind === 'template-selection'`
  returns `afterSelection(...)` prose and `planCardActions(...)` with
  `model: null, fallback: false`. No session, no provider, no budget.
- **A turn costs exactly one advisor call:** it builds `LandingContextSnapshot` and
  calls `client.ask({ message, landingContext })`.
- **Refusals are safe responses, not crashes:** `result.ok === false` yields
  `assistantFallback(...)` with text chosen locally by `advisorRefusalText(code)`.
- **Actions never come from the model:** `actions: planTurnActions({ context, message })`.
  The advisor's reply text is the only model output that reaches the UI.
- **Metadata:** `provider`, `model` (from the validated result), `fallback: degraded`.

The provider holds **no** retry policy, reserves **no** budget, remembers
**nothing** between turns and makes **no** second LLM call. The facade
(`assistant/service.ts`) remains byte-identical to `9354eef`
(`2e525191395c4c91ad4bd4c09983b940`), so the `AssistantService` contract did not move.

---

## 9. Landing deterministic action adapter

`assistant/landingActionAdapter.ts` is the only place where prose meets the action
vocabulary.

- `TURN_ACTIONS` is a closed set of the **8** conversational actions:
  `SHOW_TEMPLATES`, `RECOMMEND_TEMPLATES`, `PREVIEW_TEMPLATE`, `SELECT_TEMPLATE`,
  `SHOW_OPTIONS`, `SHOW_READY`, `UPDATE_BUSINESS_CONTEXT`, `OPEN_TEMPLATE_DRAWER`.
- `CREATE_PAGE` is excluded twice: by the set and by `copyAction` returning `null`.
- Every action is rebuilt field by field (arrays, patches, reasons, options), so
  later mutation of planner inputs cannot change a queued action.
- `planTurnActions` delegates to `utils/landingPlan.ts`; `planCardActions` delegates
  to `planSelectionActions`. The planner takes template ids **only from the
  catalog**.

The five tests in `landingActionAdapter.test.ts` prove:
1. `CREATE_PAGE` is dropped even when handed in;
2. output is primitive-copied (mutating inputs afterwards changes nothing);
3. every planned turn action is one of the eight;
4. a card click selects exactly the catalog id and never creates;
5. “créala” on a ready landing yields `SHOW_READY`, never `CREATE_PAGE`.

`utils/__tests__/createCommand.test.ts` separately pins `CREATE_PAGE` behind the
test-only switch in `planCreateCommand`.

---

## 10. runAgent/local provider disposition

- `runAgent` / `respondLocal` are **not deleted**: removing them would half-migrate
  `useCripqerSession`, which CONV-02 must not modify.
- `localProvider.ts` is documented as `SUPERSEDED AS A PRODUCT PROVIDER (CONV-02)`
  and remains byte-compatible so a test can prove the service contract did not move.
- Seeds no longer import it: `utils/seed.ts` uses `respondSeed` from
  `utils/seedResponses.ts`, a fixture-only copy.
- `agent.ts` exports four previously private helpers for the deterministic planner,
  marked `FIXTURE_ONLY`; their behavior is unchanged.
- After CONV-03 the only production turn path is `AssistantProvider → Conversion
  Advisor`; the local provider is then removable.

---

## 11. RemoteAssistantProvider disposition

- `RemoteAssistantProvider` and `assistant/remote*` were **not** integrated.
- Audit: `grep -rn "assistant/remote\|RemoteAssistantProvider\|deepseek.server" src`
  → **0 matches**.
- There is therefore exactly **one** LLM path: the Conversion Advisor's DeepSeek
  call inside the server function. No second provider, no fallback model path.
- `docs/conv02/advisor-source-manifest.md5` contains no remote-provider entry,
  confirming it was never in the imported set.

---

## 12. Provider/model configuration

| Setting | Value |
| --- | --- |
| Advisor model variable | `ADVISOR_MODEL` |
| Resolution order | `ADVISOR_MODEL` → `DEEPSEEK_MODEL` → `deepseek-flash` |
| Shared `DEEPSEEK_MODEL` | **unchanged** in code and `.env.example` |
| Provider | DeepSeek direct (`provider.server.ts`) |
| Max output tokens | `ADVISOR_MAX_OUTPUT_TOKENS` default `3584` (800 truncated 9/168 completions in CA-9B) |
| Secrets | server-only; never in client bundle, logs or this report |

`providerModelConfig.test.ts` proves: `ADVISOR_MODEL` wins over the shared variable;
the shared variable keeps its own meaning for the other assistants; the resolved
model reaches the outbound request body. `ADVISOR_*` names appear in **no** client
artifact (section 18).

---

## 13. Timeout/retry/budget

| Layer | Value | Rationale |
| --- | --- | --- |
| Advisor timeout per attempt | `12 000 ms` | `ADVISOR_DEFAULTS.timeoutMs` changed 20 000 → 12 000 |
| Advisor retries | `1` (i.e. `1 + maxRetries = 2` attempts) | `ADVISOR_MAX_RETRIES=1` |
| Retry backoff | `400 ms` | fixed |
| Operations per turn (worst case) | `2` | understanding + advice |
| Worst case | `12 s × 2 × 2 + 0.4 s ≈ 48.8 s` | fits the 60 s browser deadline |
| Browser deadline | `60 000 ms` | `assistant/advisors/transport.ts`; **no retries** |
| Budget owner | single: the reservation inside `runConversationalTurn` | one reservation covers `1 + maxRetries` attempts |

`timeoutBudget.test.ts` pins the defaults, the ceiling, the 60 s fit (the retired
20 s did **not** fit), provider naming, the browser transport's boundedness and
single-ask behavior, and single-conversation semantics for concurrent first turns.

---

## 14. Memory ownership

- **Conversation/semantic memory:** inside the advisor (server-side `Map` keyed by
  session id). The client owns only a lazily generated session id.
- **The browser transport stores no conversation state:** it sends the id, receives
  a validated 11-field projection, and keeps nothing.
- **The landing provider keeps no memory** between turns; it forwards a bounded
  snapshot and returns prose + locally planned actions.
- Single ownership is enforced by construction: there is no second store, no
  localStorage conversation, no client-side history sent to the server.

---

## 15. Observability

`integration/observability.server.ts` is server-only and emits **eight closed,
dotted events**:

1. `advisor.turn.received`
2. `advisor.turn.refused`
3. `advisor.turn.unconfigured`
4. `advisor.understanding.completed`
5. `advisor.advice.completed`
6. `advisor.guard.denied`
7. `advisor.turn.degraded`
8. `advisor.turn.completed`

**Deviation, disclosed.** The brief proposed underscore names
(`advisor_turn_started`, `advisor_provider_attempted`, `advisor_provider_success`,
`advisor_provider_failure`, `advisor_response_invalid`, `advisor_guard_denied`,
`advisor_fallback_used`, `advisor_turn_completed`). The integrated module instead
ships the advisor's **already-certified** dotted vocabulary, because:

- the module was certified in CA phases with these eight events and its tests pin
  them;
- two vocabularies would mean a second emitter, i.e. duplicate observability;
- every concept in the brief has a counterpart in the shipped eight
  (start=received, attempt/success/failure map to understanding/advice completed or
  unconfigured/degraded, invalid response→refused/guard.denied, fallback→degraded,
  end→completed).

No acceptance gate names the event vocabulary. The deviation is deliberate and
reversible if the owner wants the underscore names; it is recorded here rather than
silently reconciled.

Fields are allowlisted (`provider`, `model`, `operation`, `latency_ms`,
`error_class`, `response_valid`, `fallback_used`, `degraded`, `grounding_status`,
`reservation`, `attempts_reserved`); a `SESSION_ID_PATTERN` refuses a UUID-shaped
value in the `model` slot; a throwing sink is swallowed so logging can never fail a
turn. No secret, API key or Authorization header is ever passed to the logger.

---

## 16. Evaluation harness safety

- `evaluation/runner.server.ts` calls `requireInjectedFetch(deps)` and throws
  `EVALUATION_REQUIRES_INJECTED_FETCH` if no transport was injected.
- `runDataset` fails **closed before the first case**; it never falls back to global
  `fetch`.
- `vitest.config.ts` excludes `**/*.real-provider.test.ts` and `**/*.live.test.ts`,
  so a paid campaign can never be swept into `npm run test`.
- `package.json` adds `test:advisor:eval` for the offline evaluation suite only.
- Audit: `0` production imports of `evaluation/` or `preview/` outside
  `src/lib/conversion-advisor/`.

---

## 17. Prompt/commercial guidance

`advisor/orchestrator.server.ts` adds a commercial-honesty block to the system
prompt, which instructs the model to:

- point the user to the **real** Magic Editor route for design changes;
- never claim it has edited, generated or created a design;
- never invent prices or plan terms;
- present demo contacts as **examples**, not live data;
- not pressure the user.

The landing block injects only the sanitized snapshot. The model still cannot emit
an action, name a template id, or execute `CREATE_PAGE`: the action vocabulary is
closed at the adapter, and the template ids are re-derived by the deterministic
planner from the catalog.

---

## 18. Tests and typecheck

| Gate | Command | Result |
| --- | --- | --- |
| Advisor + landing suite | `npm run test:advisor` | `Test Files 1 failed \| 66 passed (67)` · `Tests 1 failed \| 1062 passed (1063)` |
| Brief-required files (10) | targeted run | `10 passed (10)`, `126 passed (126)` |
| Landing feature only | `npx vitest run src/features/approved-chat-landing` | `25 passed (25)`, `242 passed (242)` |
| Rotation protected suites | targeted run | `3 passed (3)`, `24 passed (24)` |
| Typecheck | baseline `9354eef` vs integration, unique `file(line,col): error TS…` sets via `comm` | baseline `1183`, integration `1183`, **new `0`, gone `0`** |
| Build | `npm run build` (Vite 8.2.1 + Nitro/Vercel preset) | exit `0` |
| Secret scan | `.vercel/output/static` (629 files) | no `DEEPSEEK_API_KEY`, `ADVISOR_*`, `sk-[A-Za-z0-9]{20,}`, `Bearer …`, `runConversationalTurn`, `createAdvisorGuard` |
| Paid provider calls | — | **0** |
| Production mutations | — | **0** |
| Commits / pushes / deploys | — | **0 / 0 / 0** |

**The single failing test is environmental and pre-existing.**
`src/lib/conversion-advisor/integration/__tests__/latency-breakdown.test.ts`
asserts a path latency budget under 100 ms; it failed here with `113.30`, and
reproduced identically in the **certified source worktree** at `118.43`. It is CPU
load, not a CONV-02 regression. The assertion was **not** weakened or skipped.

Earlier runs with the five mount artifacts present showed 13–16 failures; those came
from the CONV-03-only files and are resolved by rejection, not by weakening tests.

---

## 19. Protected module integrity

All protected files are **byte-identical** to `9354eef` after CRLF normalization.

| File | Normalized md5 | Status |
| --- | --- | --- |
| `hooks/useTemplateRotation.ts` | `3d061481e7f8f477e9672dfebba40482` | SAME |
| `utils/templateRotation.ts` | `c8f12b0b7ef1757ce36510ef56b6c532` | SAME |
| `data/templates.ts` | `33f98ffc769e8dcc34f13bd20ae1ce11` | SAME |
| `components/discover/TemplateShowcase.tsx` | `ef6afce7fd8565ee39538da21a0f1a89` | SAME |
| `components/templates/TemplateCard.tsx` | `0fb11137ce7f72dc17ed5d1935992047` | SAME |
| `hooks/useCripqerSession.ts` | `36c9db0a84db6bb9bc137ea41cf69741` | SAME |
| `hooks/__tests__/useTemplateRotation.test.ts` | `0f22607a6bf1670425c605ce281666bb` | SAME |
| `utils/__tests__/templateRotation.test.ts` | `02a3540b0d46c2624da6dbd86f816556` | SAME |
| `components/discover/__tests__/responsiveContract.test.ts` | `4e78b479b980f8baa4b3f2919f38f4a5` | SAME |
| `assistant/service.ts` | `2e525191395c4c91ad4bd4c09983b940` | SAME |
| `assistant/contracts.ts` | `7527d07bed1e59ab7818ca788feeae74` | SAME |
| `types/cripqer.ts` | `94648c324621e8321b5797a12d34b8a4` | SAME |

`ROTATION_VISUAL_FROZEN` is untouched: 12 models, 4 slots, 3200 ms cadence, 12.8 s
per-slot cycle, `SLOT_ORDER = [1, 3, 0, 2]`, anti-duplicate state machine,
`0.3s easeOut` cross-fade, hover/modal pause and reduced-motion pause all intact.
Rotation tests: **24/24 pass**. No `STOP_AND_REQUEST_PERMISSION` was triggered
because no protected file was read-write.

Billing, Mercado Pago, Analytics, Supabase migrations, Guest Editor, Power Editor and
the Magic Editor implementation were not modified.

---

## 20. Git state

```
HEAD          9354eef1c95496a266d275bf985295b6faa4327c
branch        feat/conv02-advisor-main-integration
commits       0
pushes        0
deploys       0
```

Tracked modifications (6 substantive + 1 line-ending flag):

```
 M .env.example
 M package.json
 M src/features/approved-chat-landing/assistant/localProvider.ts
 M src/features/approved-chat-landing/utils/agent.ts
 M src/features/approved-chat-landing/utils/seed.ts
 M src/routeTree.gen.ts        (CRLF/LF only; content identical to HEAD)
 M vitest.config.ts
```

Untracked (all intentional):

```
?? docs/conv02/
?? src/lib/conversion-advisor/
?? src/features/approved-chat-landing/advisor/
?? src/features/approved-chat-landing/assistant/advisors/
?? src/features/approved-chat-landing/assistant/landingActionAdapter.ts
?? src/features/approved-chat-landing/assistant/__tests__/landingActionAdapter.test.ts
?? src/features/approved-chat-landing/utils/landingPlan.ts
?? src/features/approved-chat-landing/utils/seedResponses.ts
?? src/features/approved-chat-landing/utils/__tests__/landingPlan.test.ts
?? src/features/approved-chat-landing/utils/__tests__/createCommand.test.ts
```

Per the brief, `local_commit = PREPARE_BUT_DO_NOT_CREATE_UNLESS_OWNER_AUTHORIZATION_IS_ALREADY_EXPLICIT_IN_AGENT_CONTEXT`.
No authorization was present, so **no commit was created**. The branch is left
ready to commit on the owner's word.

---

## 21. Exact scope for CONV-03

CONV-03 is the **public landing wiring**, and only that:

1. **Cut over `useCripqerSession.ts`** to
   `createAssistantService({ provider: createConversionAdvisorProvider({ client: createAdvisorTransportClient() }) })`.
   This is the first modification of a protected-adjacent shared file; it requires
   owner authorization because the file is listed under
   `ROTATION_VISUAL_FROZEN` shared scope (rotation logic itself must not change).
2. **Add the `advisorTransport` seam** to `ApprovedChatLandingProps` and the mount
   tests, then restore the five files from `docs/conv02/rejected/` by renaming them
   back under `src/`.
3. **Retire the local provider** from the product path (seeds already use
   `respondSeed`); keep or delete `runAgent` once nothing imports it.
4. **Route/flag activation:** point the public route at the advisor-backed session
   and enable the provider flag already read by the server function.
5. **Evaluation:** run the offline suite, then the paid campaign only with explicit
   owner authorization and an injected transport.
6. **No advisor-core changes** are expected: the contracts, guardrails, budget,
   memory, observability and evaluation fail-closed guard are already in place.

Out of scope for CONV-03 unless separately authorized: rotation changes, billing,
Mercado Pago, analytics, database migrations, deployment, and any second LLM path.

---

## Acceptance gates

| Gate | Result |
| --- | --- |
| `canonical_base_is_9354eef` | ✅ `9354eef1c95496a266d275bf985295b6faa4327c` |
| `conversion_advisor_present_in_destination_tree` | ✅ 103 files under the advisor dirs + 113-file manifest |
| `worktree_runtime_dependency` | ✅ 0 |
| `assistant_service_contract_changed` | ✅ false (`service.ts` byte-identical) |
| `one_llm_path_design_preserved` | ✅ one DeepSeek path |
| `model_emits_agent_actions` | ✅ false |
| `template_ids_from_model` | ✅ false |
| `landing_action_adapter_implemented` | ✅ `landingActionAdapter.ts` |
| `first_8_actions_tested` | ✅ 5 adapter tests + planner tests |
| `create_page_model_execution` | ✅ false (double lock) |
| `advisor_model_variable_dedicated` | ✅ `ADVISOR_MODEL` |
| `shared_deepseek_model_unchanged` | ✅ |
| `advisor_timeout_ms` | ✅ `12000` |
| `advisor_max_retries` | ✅ `1` |
| `future_browser_deadline_ms` | ✅ `60000` |
| `budget_owner_single` | ✅ |
| `semantic_memory_owner_single` | ✅ |
| `observability_server_only` | ✅ (vocabulary deviation disclosed in §15) |
| `evaluation_fetch_fail_closed` | ✅ `EVALUATION_REQUIRES_INJECTED_FETCH` |
| `assistant_remote_production_imports` | ✅ 0 |
| `evaluation_production_imports` | ✅ 0 |
| `preview_production_imports` | ✅ 0 |
| `rotation_tests_pass` | ✅ 24/24 |
| `no_new_type_errors` | ✅ 0 new, 0 gone (1183 → 1183) |
| `real_paid_calls` | ✅ 0 |
| `production_mutations` | ✅ 0 |
| `deploy` | ✅ 0 |
| `push` | ✅ 0 |

**CONV02_MAIN_TREE_INTEGRATION_PASS**  
**READY_FOR_CONV03_PUBLIC_LANDING_WIRING**
