# CRIPQER — SMART PAGES VISUAL GENERATION FORENSIC TRACE V1

**Task ID:** `CRIPQER_SMART_PAGES_VISUAL_GENERATION_FORENSIC_TRACE_V1`
**Agent:** CODEX (READ_ONLY_ARCHITECTURE_AUDIT + CONTROLLED_TRACE_HARNESS)
**Branch:** `feat/basic-editor-editorial-canvas-ui` (forbidden `main` — not touched)
**Date:** 2026-09-15
**Mode:** No production / engine / smart-pages / mapper / renderer / canonical / DB changes. Evidence only.

> **SUCCESS GATE:** `CRIPQER_SMART_PAGES_VISUAL_GENERATION_FORENSIC_TRACE_COMPLETE`

---

## EXECUTIVE VERDICT

The chain is fully connected: all three businesses produce a valid canonical
`BioTemplateConfig` (owner content preserved, `validateTemplate` PASS). The
"overly basic / visually very similar" symptom is **not** a renderer bug and **not**
a disconnected Engine.

Differentiation is lost **primarily at the Engine V2 recipe-selection boundary**,
with a contributing collapse at the **PAGES_7 → Engine boundary**:

1. **Smart Pages is NOT the root cause.** `PagePlanV1` outputs are materially
   different (`serviceGrid` vs `productGrid` vs `portfolioGrid`, different order/CTA).
2. **The host mapper is NOT the primary root cause.** It preserves objective,
   items, prices, media, CTA and cover into `GeneratedPageInput`; it only drops
   visual/layout hints the Engine is designed to re-author.
3. **PAGES_7 partially collapses semantics** (contributing): `normalizeBusinessCategory`
   (strict exact-match table) collapses **"Peluquería y belleza"**, **"Tienda de ropa"**
   and **"Fotografía"** all to category **`other`**; `style` is dropped so
   `visual_personality` is always **`professional`**; and the owner's **"bookings"**
   goal is flattened to **"leads"** (objective preset hardcodes `show_services → leads`).
4. **Engine V2 recipe selection is the root cause.** The engine correctly infers a
   rich archetype (`appointment_service`, `retail`, `portfolio_service`), but the
   archetype's **`family_bias` is defined yet never applied** (dead code). With
   category=`other` + personality=`professional` constant, scores are corporate-
   dominated and the **hairdresser (services)** and **clothing store (catalog)**
   converge on the **same `minimal` family**; only the **photographer (portfolio)**
   escapes to `editorial`.
5. **The renderer is faithful.** `TemplateRenderer` applies theme colors,
   typography, background, cards, buttons, motion, and renders blocks via
   `BlockRegistry` exactly as authored. Basic config ⇒ basic page.

**Net:** `SERVICE_BOOKING` and `RETAIL_CATALOG` — two materially different
businesses — converge on the **same family (`minimal`)**, same typography
(Trebuchet MS 30/600), same card preset (`minimal`, radius 10, no shadow), same
button style (`solid`, radius 10), same solid background, same `minimal` motion.
They differ only in accent color and block type.

---

## EXACT GENERATION CALL GRAPH

```
OnboardingIntentV2 (T1) + OwnerContentInput (T2)
  → mapOnboardingIntentV2ToSmartPagesRequest()      [onboarding-v2/smart-pages-adapter.ts]
PageGenerationRequest (T3)
  → generatePagePlan()                              [smart-pages/page-orchestrator.ts]
PagePlanV1 (T4)
  → mapSmartPageToEngineInput()                     [page-generator/smart-pages-host-map.ts]
       └─ mapRetailPresentationToHostInput() (catalog) [page-generator/smart-pages-retail-map.ts]
GeneratedPageInput (T6)
  → mapGeneratedPageToEngineInput()                 [page-generator/adapter.ts]
       └─ buildGeneratedPageIntent()                [page-generator/intent.ts]
       └─ mapOnboardingIntentV2ToEngineInput()      [onboarding-v2/engine-v2-adapter.ts]
EngineV2HostGenerationInput (T7)
  → generateCripqerPageWithEngineV2()               [parametric-engine-v2/internal-entrypoint.ts]
       └─ toEngineIntent() → OnboardingIntentV1
       └─ generatePowerEditorTemplate() → candidates.ts → engine.ts
            (normalize → strategy → family → rules)
       └─ buildPowerEditorRecipeV2() → toBioTemplateConfig()
BioTemplateConfig (T9)
  → validateTemplate()                              [premium-template-studio/engine/TemplateValidator.ts]
  → PublicTemplateRenderer → TemplateRenderer       [premium-template-studio/engine/…]
       (themeToCssVars, pageBackground, BlockRegistry)
Rendered public page (T10)
```

**Ownership (file → responsibility):**

| Layer                  | File                                                                                      | Owns                                   |
| ---------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------- |
| A Onboarding semantics | `onboarding-v2/types.ts`, `smart-pages-adapter.ts`                                        | intent → request                       |
| B Owner content        | `page-generator/owner-content.ts`                                                         | structured owner facts                 |
| C Request              | `smart-pages/smart-pages.types.ts`                                                        | planning DTO                           |
| D Plan                 | `smart-pages/page-orchestrator.ts`, `business-presets.ts`                                 | semantic structure (NO visuals)        |
| E Host map             | `page-generator/smart-pages-host-map.ts`                                                  | plan → GeneratedPageInput              |
| F PAGES_7              | `page-generator/adapter.ts`, `intent.ts`, `objective-presets.ts`                          | GeneratedPageInput → Engine input      |
| G Engine input         | `onboarding-v2/engine-v2-adapter.ts`                                                      | OnboardingIntentV2 → Engine host input |
| H Engine recipe        | `parametric-engine-v2/engine.ts`, `strategy.ts`, `candidates.ts`, `families.ts`           | recipe/family/theme selection          |
| H2 Engine visual       | `parametric-engine-v2/power-editor/resolvers.ts`, `blocks-v2.ts`, `to-template-config.ts` | visual tokens + blocks                 |
| I Renderer             | `premium-template-studio/engine/TemplateRenderer.tsx`                                     | faithful config → DOM                  |

---

## SCENARIO A — SERVICES (`SERVICE_BOOKING` · "Studio Aura" · "Peluquería y belleza")

| Trace              | Value                                                                                                                                                                                                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1 intent          | professionOrActivity `Peluquería y belleza`, goal `bookings`, density `complete`, CTA whatsapp                                                                                                                                                                                                                                    |
| T2 owner           | services ×2 (Corte y peinado $18.000, Coloración $35.000), contact whatsapp                                                                                                                                                                                                                                                       |
| T3 request         | businessType `Peluquería y belleza`, goal `book`, salesMode `booking`, experienceType `services`, density `rich`                                                                                                                                                                                                                  |
| T3 deferred        | `visualDirection`, `contentNeeds`, `scope.userSelected`, `business.customCategory`                                                                                                                                                                                                                                                |
| T4 plan            | `page_studio-aura`, experienceType `services`, hero `centered`, sections `[hero, about, serviceGrid, whatsappCta, footer]`                                                                                                                                                                                                        |
| T6 generated input | objective `services`, items ×2, cta whatsapp, **style = undefined**                                                                                                                                                                                                                                                               |
| T7 engine input    | profession `Peluquería y belleza`, goal `leads`, features `[services, contact]`, **style undefined**, contentBlocks `{about, services, contact}`                                                                                                                                                                                  |
| T8 decisions       | category `other`, **archetype `appointment_service`**, personality `professional`, goal `leads`, scores `{corporate:62, minimal:32, editorial:30}`, baseline `corporate`, **selected `minimal`**, layout `compact`, pattern `conversion_first`, preset `null`, mediaStrategy `minimal-no-media`, candidate `engine#2.1`, score 88 |
| T9 blocks          | `[text, services(minimal), cta(panel), contact(list)]`                                                                                                                                                                                                                                                                            |
| T9 theme           | primary `#3F5B32`; typography `Trebuchet MS` 30/600; cards `minimal` r10 no-shadow; buttons `solid` r10; background `solid #FBFCF8`; motion `minimal` fade                                                                                                                                                                        |
| T10                | valid, faithful                                                                                                                                                                                                                                                                                                                   |

## SCENARIO B — CATALOG (`RETAIL_CATALOG` · "Norte Concept" · "Tienda de ropa")

| Trace              | Value                                                                                                                                                                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T3 request         | businessType `Tienda de ropa`, goal `sell`, experienceType `catalog`, density `rich`                                                                                                                                                                                                               |
| T4 plan            | experienceType `catalog`, sections `[hero, productGrid, whatsappCta, footer]`                                                                                                                                                                                                                      |
| T6 generated input | objective `catalog`, items ×2 (media+destination), cta whatsapp, cover set, style undefined                                                                                                                                                                                                        |
| T7 engine input    | profession `Tienda de ropa`, goal `sell`, features `[products, contact]`, contentBlocks `{products, featured, about}`                                                                                                                                                                              |
| T8 decisions       | category `other`, **archetype `retail`**, personality `professional`, goal `sell`, scores `{corporate:54, editorial:24, minimal:24, creator:10, energetic:14}`, baseline `corporate`, **selected `minimal`**, layout `split`, pattern `service_first`, preset `null`, mediaStrategy `banner-first` |
| T9 blocks          | `[text, cta, productGrid, contact]`                                                                                                                                                                                                                                                                |
| T9 theme           | primary `#7A3B2E`; typography `Trebuchet MS` 30/600 (**identical to A**); cards `minimal` r10 (**identical to A**); buttons `solid` r10 (**identical to A**); background `solid`; motion `minimal`                                                                                                 |
| T10                | valid, faithful                                                                                                                                                                                                                                                                                    |

**⇒ A and B are the SAME visual family (`minimal`) with identical typography/cards/buttons/motion. Only accent color + block type differ.**

## SCENARIO C — PORTFOLIO (`CREATIVE_PORTFOLIO` · "Luz Norte" · "Fotografía")

| Trace              | Value                                                                                                                                                                                                                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T3 request         | businessType `Fotografía`, goal `showcase`, experienceType `portfolio`, density `rich`                                                                                                                                                                                                                                 |
| T4 plan            | experienceType `portfolio`, sections `[hero, about, portfolioGrid, whatsappCta, footer]`                                                                                                                                                                                                                               |
| T6 generated input | objective `portfolio`, items ×2 (media+destination), cover set                                                                                                                                                                                                                                                         |
| T7 engine input    | profession `Fotografía`, goal `portfolio`, features `[portfolio, contact]`, contentBlocks `{portfolio, about}`                                                                                                                                                                                                         |
| T8 decisions       | category `other`, **archetype `portfolio_service`**, personality `professional`, goal `portfolio`, scores `{corporate:46, editorial:40, minimal:34, creator:10}`, baseline `corporate`, **selected `editorial`**, layout `editorial`, pattern `editorial_stack`, preset `editorial_calm`, mediaStrategy `banner-first` |
| T9 blocks          | `[text, cta, portfolio]`                                                                                                                                                                                                                                                                                               |
| T9 theme           | primary `#38524A`; typography `Times New Roman` serif 44/600; cards/buttons/spacing differ from A/B (editorial family)                                                                                                                                                                                                 |
| T10                | valid, faithful                                                                                                                                                                                                                                                                                                        |

**⇒ Only the portfolio business escapes `minimal` (to `editorial`), because its `portfolio` goal lifts the editorial score enough for `editorial_calm` to win.**

---

## FIELD SURVIVAL MATRIX

`✓` preserved · `partial` degraded · `✗` lost · `engine` Engine-owned only.

| Semantic signal                                          | Intent                  | Request            | Plan        | Host map    | Engine input             | Config          | Rendered | Where lost?                        | Severity |
| -------------------------------------------------------- | ----------------------- | ------------------ | ----------- | ----------- | ------------------------ | --------------- | -------- | ---------------------------------- | -------- |
| business/activity (free-form)                            | ✓                       | ✓                  | ✓           | ✓           | ✓                        | ✓ role          | ✓        | —                                  | —        |
| business **category**                                    | beauty/retail/creator   | ✗                  | ✗           | ✗           | **`other`**              | —               | —        | `normalizeBusinessCategory` strict | P1       |
| experience type                                          | ✓                       | ✓ expType          | ✓           | ✓ obj       | ✓ features               | ✓ block         | ✓        | —                                  | —        |
| primary goal                                             | bookings/sell/portfolio | book/sell/showcase | ✓           | ✗           | **leads/sell/portfolio** | ✓               | ✓        | objective preset hardcodes         | P2       |
| services/catalog/portfolio                               | ✓                       | ✓                  | ✓           | ✓           | ✓                        | ✓ block         | ✓        | —                                  | —        |
| content quantity                                         | ✓                       | ✓                  | ✓           | ✓           | ✓                        | ✓               | ✓        | —                                  | —        |
| price                                                    | ✓                       | ✓                  | ✓           | ✓           | ✓                        | ✓               | ✓        | —                                  | —        |
| media                                                    | ✓                       | ✓                  | ✓           | ✓           | ✓                        | ✓               | ✓        | —                                  | —        |
| CTA                                                      | ✓                       | ✓                  | ✓           | ✓           | ✓                        | ✓               | ✓        | —                                  | —        |
| contact destination                                      | ✓                       | ✓                  | ✓           | ✓           | ✓                        | ✓               | ✓        | —                                  | —        |
| density                                                  | complete                | rich               | ✗           | ✗           | deferred                 | engine          | engine   | adapter defers                     | P3       |
| sales mode                                               | —                       | booking/contact    | ✗           | ✗           | ✗                        | engine          | engine   | dropped at PAGES_7                 | P2       |
| visual emphasis/style                                    | let_decide              | ✗                  | ✗           | ✗ undefined | ✗ → `professional`       | engine          | engine   | host map never fills `style`       | P1       |
| section ordering                                         | —                       | —                  | ✓           | ✗           | ✗                        | engine          | engine   | GeneratedPageInput flat            | P3       |
| layout intent                                            | —                       | —                  | heroVariant | ✗           | ✗                        | engine          | engine   | not passed                         | P3       |
| theme/palette/typography/cards/buttons/background/motion | —                       | —                  | —           | —           | —                        | engine (family) | ✓        | engine-owned                       | —        |

**Key:** all _owner facts_ survive to Engine input; the _visual_ signals (category,
style/personality, density, sales mode) are what collapse. Every theme token is
engine-owned, derived only from `(category, personality, goal)`.

## PAGE GENERATION REQUEST COMPARISON (Q1)

**Materially different: YES.** businessType, goal (`book`/`sell`/`showcase`),
salesMode, experienceType (`services`/`catalog`/`portfolio`), catalog content,
primaryAction all differ.

## PAGE PLAN COMPARISON (Q2)

**Materially different: YES.**

|                | A                                                 | B                                          | C                                                   |
| -------------- | ------------------------------------------------- | ------------------------------------------ | --------------------------------------------------- |
| experienceType | services                                          | catalog                                    | portfolio                                           |
| sections       | hero, about, **serviceGrid**, whatsappCta, footer | hero, **productGrid**, whatsappCta, footer | hero, about, **portfolioGrid**, whatsappCta, footer |
| primary CTA    | whatsapp                                          | whatsapp                                   | whatsapp                                            |

→ **Phase 4:** PagePlans are meaningfully different ⇒ continue downstream. Smart
Pages orchestrator + presets are **not** the root cause.

## HOST MAPPER COMPARISON (Q3)

Preserves objective + content + CTA; drops visual/layout hints. `style` exists on
`GeneratedPageInput` and the Engine consumes it, but the host map **never fills it**
(ACCIDENTAL_LOSS). Everything else dropped (section identity, heroVariant, layout
hints) is INTENTIONAL_DEFERRED (Engine owns layout/visual).

## PAGES_7 INPUT COMPARISON (Q4)

Objectives do **not** collapse (services/catalog/portfolio → leads/sell/portfolio).
Profession survives as free-form string but `normalizeBusinessCategory` collapses it
to `other`. Content blocks + media survive. **"bookings" → "leads"** (objective
preset hardcodes `show_services → leads`).

---

## ENGINE V2 INPUT COMPARISON (Q7)

Engine receives **different inputs**: profession strings differ, goals differ
(leads/sell/portfolio), content blocks differ (services/products/portfolio), media
differs, CTA differs. But the recipe-driving signals collapse:

| Engine signal           | A                     | B                 | C                   |
| ----------------------- | --------------------- | ----------------- | ------------------- |
| business_category       | `other`               | `other`           | `other`             |
| visual_personality      | `professional`        | `professional`    | `professional`      |
| primary_goal            | `leads`               | `sell`            | `portfolio`         |
| inferred archetype      | `appointment_service` | `retail`          | `portfolio_service` |
| archetype → family_bias | **never applied**     | **never applied** | **never applied**   |

## ENGINE RECIPE SELECTION (Q5/Q6)

`buildDesignProfile()` scores families from `(personality, category, goal)` only.
The archetype is inferred (correctly) but its `family_bias` is **dead code** (defined
in `archetypes.ts`, never read in `strategy.ts`/`engine.ts`). Baseline family is
`corporate` for all three. Candidate variant exploration (`selectFamilyVariant`) then
picks among the top-3 families deterministically:

|                     | A                                      | B                                                                | C                                                  |
| ------------------- | -------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| family_scores       | corporate 62, minimal 32, editorial 30 | corporate 54, editorial 24, minimal 24, energetic 14, creator 10 | corporate 46, editorial 40, minimal 34, creator 10 |
| baseline family     | corporate                              | corporate                                                        | corporate                                          |
| **selected family** | **minimal**                            | **minimal**                                                      | **editorial**                                      |
| layout              | compact                                | split                                                            | editorial                                          |
| pattern             | conversion_first                       | service_first                                                    | editorial_stack                                    |
| preset              | null                                   | null                                                             | editorial_calm                                     |

**Q6 answer:** Yes — A (services) and B (catalog) fall into the **same `minimal`
family** (not a hard-coded "default", but a deterministic convergence from the
category=`other` + personality=`professional` + weak goal differentiation).

## ENGINE VISUAL AUTHORING COMPARISON (Q7/Q8)

What Engine **actually varies** today: accent/primary color (palette pick per
variant), and — only when the **family** differs — typography, card preset, button
style, background type, layout, motion preset, spacing. Block composition
(services/productGrid/portfolio) varies by content.

What Engine **does not author** for these scenarios (capability exists but not used):
texture layers (grain/linen/mesh/frost), decorative frames (hairline/glow/inset),
gradient backgrounds, banner-led hero (only used `banner-first` media strategy; no
hero banner override), richer card/button variants, more than 2 palette options per
family. These are **CANONICAL_SUPPORTS_BUT_ENGINE_NOT_AUTHORING** — expansion
candidates, not canonical gaps.

## RENDERER FIDELITY (Q9)

**Faithful.** `TemplateRenderer` applies `themeToCssVars` (colors), typography,
`pageBackground`, card/button styles, `motionCssVars` + `getMotionConfig`, and
renders blocks via `BlockRegistry`. Config is basic ⇒ output is basic. **Renderer is
not the root cause.**

## ENGINE VS EDITOR CAPABILITY GAP (Phase 9)

- **ENGINE_ALREADY_CAN_AUTHOR:** solid background, per-family palettes (2), 6
  families, spacing/density, layout variants (compact/split/editorial), motion
  presets, services/productGrid/portfolio blocks.
- **CANONICAL_SUPPORTS_BUT_ENGINE_NOT_AUTHORING (expansion candidates):** texture,
  decorative frames, gradient backgrounds, banner hero composition, richer card/button
  treatments, more palette options.
- **EDITOR_ONLY (stay manual):** arbitrary CSS, mesh/multi-stop gradients (engine
  already marks them `not_supported_by_renderer`/future-safe).
- **CANONICAL_GAP (cannot safely generate yet):** none observed for these inputs.

---

## ROOT CAUSES

| #   | Classification                       | Evidence                                                                                                                                                               | Severity |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| RC1 | **ENGINE_RECIPE_SELECTION**          | `family_bias` (archetype strategy) is defined but never applied; category collapses to `other`; personality fixed to `professional` ⇒ A+B converge on `minimal` family | **P1**   |
| RC2 | **PAGES_7_ADAPTER** (contributing)   | `normalizeBusinessCategory` strict table → `other`; `style` dropped → `professional`; `bookings` → `leads`                                                             | P2       |
| RC3 | **SMART_PAGES_HOST_MAPPING** (minor) | `GeneratedPageInput.style` exists but is never filled (ACCIDENTAL_LOSS of visual direction)                                                                            | P2       |
| RC4 | EXPECTED_DEFERRED                    | section order / heroVariant / layout hints intentionally dropped (Engine owns layout)                                                                                  | P3       |

**NOT root cause:** Smart Pages orchestrator/presets, renderer, canonical validator.

## P0 / P1 / P2 / P3

- **P0 (bypassed/broken):** none.
- **P1 (primary cause of generic output):** **ENGINE_RECIPE_SELECTION** — the
  correctly-inferred archetype is never used to choose a family, so materially
  different businesses converge on `minimal`.
- **P2:** PAGES_7 category collapse (`other`) + style drop; host-map `style` not
  filled; `bookings`→`leads` goal flattening; `salesMode` dropped.
- **P3 (polish/future):** density/`visualDirection`/section-order/heroVariant not
  threaded; richer texture/frame/gradient authoring.

## WHAT IS WORKING

- Full chain generates valid canonical `BioTemplateConfig` for all three.
- Owner facts (activity, goal→objective, content, prices, media, CTA, contact) are
  preserved end-to-end.
- Block composition differentiates: `services` vs `productGrid` vs `portfolio`.
- Archetype inference is **correct** (`appointment_service`/`retail`/`portfolio_service`).
- Renderer faithfully renders whatever the Engine authors.

## WHAT IS BEING LOST

1. Visual family differentiation: category→`other` + personality→`professional` +
   dead `family_bias` ⇒ A/B both `minimal`.
2. `visualDirection`/`style` (never threaded to Engine).
3. `density` and `salesMode` (deferred/dropped).
4. `bookings` intent (flattened to `leads`).
5. Section order / heroVariant / layout intent (Engine re-authors from scratch).

## WHAT SHOULD NOT BE CHANGED

- Smart Pages orchestrator + presets (already differentiated).
- Renderer / canonical schema / validator.
- Owner-content contract (facts already survive).
- The frozen Smart Pages 2–5 / onboarding 5a/5b / premium onboarding tests.

---

## SMALLEST CORRECT NEXT IMPLEMENTATION (Q11)

Wire the **already-defined** archetype `family_bias` into `buildDesignProfile()`
(`src/lib/parametric-engine-v2/strategy.ts`) so the correctly-inferred archetype
actually biases family scoring. Small, isolated Engine change (resolve
`inferArchetype` inside strategy, `apply(strategy.family_bias)`). Directly breaks the
A/B `minimal` convergence without touching Smart Pages, host mapper, PAGES_7 or renderer.

(Secondary options: pass `style` through `GeneratedPageInput` → Engine so personality
isn't always `professional`; map free-form professions via the existing archetype
keywords instead of the strict `CATEGORY_MAP`.)

## NEXT TASK ID (Q12)

**`ENGINE_V2_RECIPE_DIVERSIFICATION`** — Engine receives differentiated inputs
(different archetypes are correctly inferred) but the recipe selector ignores that
signal (`family_bias` dead) and converges services/catalog on the same family.

→ Modify **Engine V2** (recipe selection / strategy), **not** Smart Pages, the host
mapper, PAGES_7, or the renderer.

---

## FINAL ANSWERS (Q1–Q12)

- **Q1** Requests materially different? **YES.**
- **Q2** PagePlanV1 materially different? **YES.**
- **Q3** Host mapping preserves differences? **Partial** — objective/content/CTA yes; visual hints + `style` no.
- **Q4** PAGES_7 preserves into Engine input? **Partial** — objective/content/media yes; category→`other`, style→`professional`, bookings→`leads`.
- **Q5** Recipe per scenario? **A=`minimal`/conversion_first, B=`minimal`/service_first, C=`editorial`/editorial_stack.**
- **Q6** Same fallback/default recipe? **A and B converge on `minimal`** (deterministic convergence, not a hard-coded default).
- **Q7** Visual props varied today? **Accent color always; typography/cards/buttons/background/layout/motion only when family differs.**
- **Q8** Supported caps not authored? **Texture, frames, gradient/banner hero, richer card/button variants, more palettes.**
- **Q9** Renderer faithful? **YES.**
- **Q10** Where does most differentiation disappear? **Engine recipe selection (family), with PAGES_7 category/style collapse upstream.**
- **Q11** Smallest correct fix? **Apply existing `family_bias` in `buildDesignProfile()`.**
- **Q12** Next task modifies what? **Engine V2 (recipe selection / strategy).**

---

## NOT_VERIFIED

- Desktop/mobile pixel screenshots were **not** produced by this task (read-only
  renderer smoke is covered by existing `smart-pages-retail-map.test.ts` and
  `page-generator.canonical.test.ts`, which smoke-render `PublicTemplateRenderer`).
- A pre-existing Spanish-language draft report and a separate
  `visual-generation-trace.test.tsx` harness (with PNG/HTML evidence) were already
  present under `cripqer-generation-forensic-trace/`. They are **not** produced by
  this task and reach a different (host-mapper-centric) conclusion; this report
  supersedes them with runtime-traced family-level evidence (`scenario-A/B/C.json`).
- `family_bias` being unused was verified by code search (defined in `archetypes.ts`,
  never referenced in `strategy.ts`/`engine.ts`/`candidates.ts`).

## REGRESSION SAFETY

Only these were added — **no production behavior changed**:

- `src/lib/onboarding-v2/__tests__/cripqer-forensic-trace.test.ts` (new harness)
- `cripqer-generation-forensic-trace/{scenario-A,scenario-B,scenario-C}.json`

Regression run: **158 tests passed, 1 skipped** across `src/lib/onboarding-v2`,
`src/lib/smart-pages`, `src/lib/page-generator` (incl. Smart Pages 2–5, PAGES_7,
owner-content, retail map, onboarding adapter). All frozen foundations remain PASS.

---

**SUCCESS GATE:** `CRIPQER_SMART_PAGES_VISUAL_GENERATION_FORENSIC_TRACE_COMPLETE`
