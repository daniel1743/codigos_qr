# CRIPQER — GENERATION INSPECTOR V1 REPORT

**Task ID:** `CRIPQER_GENERATION_INSPECTOR_V1`
**Agent:** CODEX (CONTROLLED_QA_DIAGNOSTIC_TOOLING)
**Branch:** `feat/basic-editor-editorial-canvas-ui` (forbidden `main` — not touched)
**Date:** 2026-09-15

> **SUCCESS GATE:** `CRIPQER_GENERATION_INSPECTOR_RUNTIME_PASS_FROZEN`

---

## EXECUTIVE VERDICT

A Cripqer-specific "DevTools for generation" is now available on the QA-only
`/onboarding-test` route. It traces a single generation attempt across all ten
stages (T1 onboarding intent → T10 renderer), classifies every tracked signal as
PRESERVED / DEGRADED / LOST / FALLBACK / REAUTHORED / NOT_SUPPORTED, and produces
an evidence-derived auto-diagnosis plus a per-layer health summary.

The inspector is **diagnostic-only**: it never alters generation output, never
writes to the DB, never publishes, and is never reachable from production routes.
It instruments existing values at boundaries (a single non-behavioral Engine seam)
rather than re-implementing generation logic.

The three target deviations are all detectable at runtime:

- `CATEGORY_COLLAPSE` — `"Tienda de ropa" → "other"` (DEGRADED)
- `STYLE_FALLBACK` — `undefined → professional` (FALLBACK)
- `BOOKING_GOAL_DEGRADATION` — `bookings → leads` (DEGRADED)
  plus `ARCHETYPE`, `FAMILY_BIAS` (now active), `VISUAL_AUTHORING_LIMIT`.

## TRACE ARCHITECTURE

```
OnboardingIntentV2 + OwnerContentInput
  → mapOnboardingIntentV2ToSmartPagesRequest   (T3 PageGenerationRequest)
  → generatePagePlan                            (T4 PagePlanV1)
  → mapSmartPageToEngineInput                   (T5 GeneratedPageInput)
  → mapGeneratedPageToEngineInput               (T6 EngineV2HostGenerationInput)
  → generateCripqerPageWithEngineV2Traced       (T7 strategy + T8 visual authoring)
  → validateTemplate / BioTemplateConfig        (T9 canonical output)
  → PublicTemplateRenderer                      (T10 renderer)
```

The trace is captured by `src/lib/generation-inspector/recorder.ts`
(`buildGenerationTrace`), which assembles a `GenerationTraceV1` from the **real**
values the generation already produced. The Engine strategy (T7) is captured by a
new non-behavioral seam `generateCripqerPageWithEngineV2Traced` in
`internal-entrypoint.ts`, which reuses the engine's own private `toEngineIntent` /
`contentFor` and the real `normalizeIntent`, `inferArchetype`, `buildDesignProfile`
and `generatePowerEditorCandidates` — it does **not** re-implement strategy logic.
A fingerprint cross-check in the tests proves the traced run matches the live run.

The server RPC `generateSmartPageWithTraceFn` (`generation-inspector-server.ts`)
runs the real generation chain and returns `{ generation, trace }`.

## FILES CHANGED

New (QA-owned, non-production):

- `src/lib/generation-inspector/types.ts` — trace contracts (`GenerationTraceV1`).
- `src/lib/generation-inspector/classify.ts` — transformation classifier.
- `src/lib/generation-inspector/diagnose.ts` — auto-diagnosis + summary + media.
- `src/lib/generation-inspector/recorder.ts` — trace recorder.
- `src/lib/generation-inspector/index.ts` — public QA exports + `createTraceId`.
- `src/lib/generation-inspector/generation-inspector-server.ts` — QA RPC.
- `src/lib/generation-inspector/__tests__/classify.test.ts` — unit tests.
- `src/lib/generation-inspector/__tests__/recorder.test.ts` — integration tests.
- `src/components/generation-inspector/GenerationInspector.tsx` — inspector UI.
- `src/components/generation-inspector/generation-inspector.css` — inspector styles.

Minimal instrumentation (non-behavioral, additive):

- `src/lib/parametric-engine-v2/internal-entrypoint.ts` — added
  `EngineV2StrategyTrace` + `generateCripqerPageWithEngineV2Traced` (imports + one
  new exported function; existing `generateCripqerPageWithEngineV2` unchanged).
- `src/components/onboarding-v2/premium/PremiumOnboardingFlow.tsx` — optional
  `enableInspector` prop (default `false`), inspector state + Ctrl+Shift+D + button.
- `src/routes/onboarding-test.tsx` — passes `enableInspector` (QA route only).

## QA ROUTE INTEGRATION

- `/onboarding-test` renders `<PremiumOnboardingFlow enableInspector />`.
- `/onboarding-preview` (production preview) is **unchanged**
  (`<PremiumOnboardingFlow />`, no inspector).
- Activation is a floating **"Diagnóstico"** button (bottom-right) plus
  **Ctrl+Shift+D**. It does not hijack F12 and is never on production routes.
- `robots: noindex, nofollow, noarchive` (existing QA behavior) is preserved.

## TRACE ID

## TRACE STAGES T1–T10

| Stage | Name                   | Contract                    | Captured value                                                       |
| ----- | ---------------------- | --------------------------- | -------------------------------------------------------------------- |
| T1    | ONBOARDING INTENT      | OnboardingIntentV2          | identity/business/outcome/visualDirection/contentNeeds/actions/scope |
| T2    | OWNER CONTENT          | OwnerContentInput           | identity/services/products/menu/portfolio/events/contact/media       |
| T3    | SMART PAGES REQUEST    | PageGenerationRequest       | businessType/goal/density/salesMode/experienceType/primaryAction     |
| T4    | PAGE PLAN              | PagePlanV1                  | experienceType/heroVariant/sections/CTA                              |
| T5    | HOST MAPPING           | GeneratedPageInput          | objective/title/activity/style/cover/cta/items                       |
| T6    | PAGES_7 / ENGINE INPUT | EngineV2HostGenerationInput | profession/goal/style/selectedFeatures/cardMedia/contentBlocks       |
| T7    | ENGINE STRATEGY        | EngineV2StrategyTrace       | category/personality/goal/archetype/family_bias/family_scores/family |
| T8    | VISUAL AUTHORING       | PowerEditorRecipeV2         | typography/colors/background/cards/buttons/spacing/motion/blocks     |
| T9    | CANONICAL OUTPUT       | BioTemplateConfig           | theme/blocks/generation/media + validateTemplate                     |
| T10   | RENDERER               | PublicTemplateRenderer      | renderer used, properties applied, unsupported list                  |

## PRESERVED / DEGRADED / LOST / FALLBACK CLASSIFICATION

The classifier (`classify.ts`) derives status purely from before/after values:

- **PRESERVED** ✅ — equal values survive (business name, profession, services, products, portfolio, contact, owner media, archetype inference).
- **DEGRADED** ⚠️ — value survives with lost specificity (`business category → other`, `bookings → leads`).
- **LOST** ❌ — signal disappears before a downstream layer (sales mode / density at the Engine boundary).
- **FALLBACK** ↪ — system supplied a default (`visual personality: undefined → professional`).
- **REAUTHORED** ◆ — Engine replaced a semantic hint with an Engine-owned decision (section types/order, hero variant, CTA position, visual family).
- **NOT_SUPPORTED** ◌ — capability unavailable in that layer (contextual media, renderer-unsupported capabilities).

## ENGINE RECIPE DIAGNOSTICS

The Inspector's "Engine" tab shows the actual runtime decisions:

- **inferred archetype** — e.g. `appointment_service` / `retail` / `portfolio_service`.
- **family_bias** — the archetype `family_bias` actually applied (now active after
  `ENGINE_V2_RECIPE_DIVERSIFICATION`; visible with its per-family weights).
- **family_scores (with bias)** and **family_scores (before bias)** — the before
  values are derived by subtracting the applied `family_bias` from the real final
  scores (no independent recomputation of the strategy).
- **selected family / layout / pattern / preset / media strategy / score / candidate**.

These are read from the real `buildDesignProfile` output and the real
`PowerEditorRecipeV2`, never recomputed with different logic.

## VISUAL AUTHORING DIAGNOSTICS

The "Visual Authoring" tab compares what the Engine **could** author versus what it
**did** author for this generation:

- **Selected** — `capabilities_used` (capabilities actually authored).
- **Not selected** — supported capabilities skipped for this generation (from
  `capabilities_skipped` with a non-"unsupported" reason: texture, banner hero,
  rich frames, additional blocks, etc.).
- **Unsupported** — capabilities marked `not_supported_by_renderer`.

It also shows the authored typography, palette, background, cards, buttons, spacing,
motion and the final block list.

## CONTEXTUAL MEDIA DIAGNOSTICS

The "Media" tab truthfully reports:

- owner media available / priority, contextual media needed / allowed;
- whether a real Unsplash/Pexels search was executed (it never was in this
  generation — no fabricated API activity);
- selected asset / fallback reason;
- result string (`OWNER MEDIA PRESENT` or `NO CONTEXTUAL HERO IMAGE`).

Truth rules are honored: no invented queries, no stock image claimed as owner media,
owner media always outranks contextual stock.

## UNSPLASH STATUS

Detected at runtime from the server integration secret
(`getServerIntegrationSecret("UNSPLASH_ACCESS_KEY")`). The Inspector shows
`CONNECTED` / `NOT_CONNECTED` based on whether the key is configured, without ever
exposing the key value.

## PEXELS STATUS

Detected at runtime from `getServerIntegrationSecret("PEXELS_API_KEY")`. The
Inspector shows `CONNECTED` / `NOT_CONNECTED` without exposing the key.

## CANONICAL VALIDATION

`validateTemplate` runs on the generated `BioTemplateConfig` (T9). The Inspector
shows `valid` + `issueCount`, and the layer summary reports `CANONICAL ✅` when
valid. The success gate also asserts `summary.CANONICAL.status === "OK"`.

## RENDERER FIDELITY

The renderer stage (T10) records that `PublicTemplateRenderer → TemplateRenderer`
applies theme colors, typography, background, cards, buttons and motion via the
real `themeToCssVars` / `pageBackground` / `BlockRegistry` path. The Inspector
reports `RENDERER ✅` because the config is rendered faithfully (the renderer is
not where differentiation is lost — it renders exactly what the Engine authored).

## FAILURE MODE

If generation fails, the trace preserves every completed prior stage and marks the
exact failing stage with a safe error code and sanitized message (no raw HTML or
stack traces in the normal UI):

```
✅ ONBOARDING INTENT
✅ OWNER CONTENT
❌ SMART PAGES REQUEST      (or HOST MAPPING / ENGINE STRATEGY)
   code: MAPPING_ERROR
   message: (sanitized)
```

## SCENARIO A — SERVICES (`SERVICE_BOOKING` · "Peluquería y belleza")

Inspector findings: `appointment_service` archetype correctly inferred ✅; business
category `beauty → other` DEGRADED ⚠️; `bookings → leads` DEGRADED ⚠️; visual
personality `undefined → professional` FALLBACK ↪; family_bias active ✅; visual
authoring omits texture/hero/frames (not selected) ⚠️; canonical ✅; renderer ✅.

## SCENARIO B — CATALOG (`RETAIL_CATALOG` · "Tienda de ropa")

Inspector findings: `retail` archetype ✅; business category `retail → other`
DEGRADED ⚠️; `sell` preserved ✅; visual personality FALLBACK ↪; family_bias active ✅;
visual authoring omissions visible ⚠️; canonical ✅; renderer ✅.

## SCENARIO C — PORTFOLIO (`CREATIVE_PORTFOLIO` · "Fotografía")

Inspector findings: `portfolio_service` archetype ✅; business category
`creator → other` DEGRADED ⚠️; `show_portfolio → portfolio` preserved (goal mapped
faithfully) ✅; visual personality FALLBACK ↪; family_bias active ✅; visual authoring
omissions visible ⚠️; canonical ✅; renderer ✅.

## TEST RESULTS

- `src/lib/generation-inspector/__tests__/classify.test.ts` — **5 passed**.
- `src/lib/generation-inspector/__tests__/recorder.test.ts` — **4 passed**
  (3 scenarios + bookings→leads degradation), including the fingerprint
  faithfulness cross-check (`traced.generation.fingerprint === live fingerprint`).

All target assertions hold: category collapse DEGRADED, style fallback FALLBACK,
goal degradation DEGRADED, `family_bias` non-empty, selected family visible, visual
authoring omissions visible, canonical validation OK, renderer OK.

## BUILD

The new/changed modules compile under the project's esbuild toolchain (the Vitest
runs transformed and executed them without error). A full `tsc --noEmit` was run;
the project has numerous pre-existing strict-null/`exactOptionalPropertyTypes`
errors unrelated to this task. The new `generation-inspector` sources were made
`exactOptionalPropertyTypes`-clean and only reuse the existing (loosely-typed)
`SmartPagesHostMappingResult` via explicit runtime narrowing.

## ESLINT

`eslint` on the new/changed files reports **only** `prettier/prettier`
`Delete ␍` line-ending noise (the editor writes CRLF on Windows while Prettier
expects LF) — **1361 errors, all fixable by `--fix`, and no real lint/type rules**.
The pre-existing project files exhibit the same CRLF behavior (git already reports
"LF will be replaced by CRLF").

## DIFF CHECK

- `git diff --check` (whitespace) — expected CRLF-only noise; no logic changes.
- Production generation behavior: **unchanged** (only additive exports/props).
- Smart Pages / PAGES_7 / Engine recipes / canonical / renderer / DB: **untouched**.

## KNOWN LIMITATIONS

- `family_scores_before_bias` is derived arithmetically (`scores − family_bias`)
  from the real final scores, not captured as a second instrumented value; it is
  labeled as derived and never recomputes the strategy.
- The contextual-media tab reports Unsplash/Pexels **connection state** only; no
  API call is made (truth rule: never claim an API call that did not happen).
- Desktop/mobile visual screenshots were **not** produced by this task; the
  renderer stage is descriptive (renderer + applied properties) rather than a pixel
  capture.
- The Engine strategy is captured by a deterministic second run of the engine's
  pure candidate pipeline, cross-checked by fingerprint; it is QA-only and never
  affects the live generation.

## NEXT RECOMMENDATION

Use the inspector at `/onboarding-test` to generate a real page, open
**Diagnóstico** (or Ctrl+Shift+D), and read the auto-diagnosis. The first
meaningful deviation to fix (per the trace) is the **visual personality threading**
(`undefined → professional`, FALLBACK) or **category semantic mapping**
(`→ other`, DEGRADED) — both are PAGES_7/host-map concerns. Candidate follow-ups:

- `PAGES_7_CATEGORY_SEMANTIC_MAPPING_FIX`
- `VISUAL_PERSONALITY_THREADING`
- `BOOKINGS_INTENT_PRESERVATION`
- `ENGINE_V2_VISUAL_AUTHORING_EXPANSION`
- `ENGINE_V2_CONTEXTUAL_MEDIA_STRATEGY_UNSPLASH_PEXELS`

---

## ARCHITECTURE GATES

| Gate                          | Value                           |
| ----------------------------- | ------------------------------- |
| QA_ONLY                       | ✅ true                         |
| PRODUCTION_GENERATION_CHANGED | ✅ false                        |
| SMART_PAGES_CHANGED           | ✅ false                        |
| ENGINE_BEHAVIOR_CHANGED       | ✅ false (additive export only) |
| PAGES_7_BEHAVIOR_CHANGED      | ✅ false                        |
| CANONICAL_CHANGED             | ✅ false                        |
| RENDERER_CHANGED              | ✅ false                        |
| DB_CHANGED                    | ✅ false                        |
| MIGRATION_CREATED             | ✅ false                        |
| UNSPLASH_BEHAVIOR_CHANGED     | ✅ false                        |
| PEXELS_BEHAVIOR_CHANGED       | ✅ false                        |
| AUTO_FIX_ENABLED              | ✅ false                        |

---

**SUCCESS GATE:** `CRIPQER_GENERATION_INSPECTOR_RUNTIME_PASS_FROZEN`
