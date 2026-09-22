# CRIPQER PREMIUM VISUAL RUNTIME ALIGNMENT FIX V1

**Task ID:** `CRIPQER_PREMIUM_VISUAL_RUNTIME_ALIGNMENT_FIX_V1`  
**Type:** `CONTROLLED_RUNTIME_VISUAL_REPAIR`  
**Branch:** `feat/basic-editor-editorial-canvas-ui`  
**Agent:** CODEX

## Verdict

`CRIPQER_PREMIUM_VISUAL_RUNTIME_ALIGNMENT_PASS_FROZEN`

La divergencia fue localizada y reparada en tres límites concretos. La cadena
real de `/onboarding-test` ahora conserva `bookings → book → booking`, permite
que el tema de tarjetas generado por Engine llegue al bloque `services`, y
produce un hero/banner degradado con extremos distintos cuando no existe media
del propietario.

La página QA se generó, persistió y abrió en el editor. Se conserva en la base
de datos; no se ejecutó limpieza destructiva.

## Exact runtime path

```text
/onboarding-test
  → PremiumOnboardingFlow
  → generateSmartPageFromOnboardingFn
  → generateSmartPageFromOnboarding
  → mapOnboardingIntentV2ToSmartPagesRequest
  → generatePagePlan
  → mapSmartPageToEngineInput
  → mapGeneratedPageToEngineInput / buildGeneratedPageIntent
  → generateCripqerPageWithEngineV2
  → generatePowerEditorTemplate
  → Engine V2 normalize → archetype → strategy → family → recipe
  → buildPowerEditorRecipeV2
  → toBioTemplateConfig
  → validateTemplate
  → persistPremiumOnboardingGeneratedPageFn
  → auth/ownership → public.pages → canonical draft → read-after-write
  → READY
  → /pages/{pageId}/edit
  → PowerEditorHost target={{ kind: "page", id: pageId }}
```

El entrypoint Engine exacto es:

`src/lib/parametric-engine-v2/internal-entrypoint.ts` —
`generateCripqerPageWithEngineV2()`.

El Generation Inspector usa el seam trazado del mismo entrypoint; no ejecuta
una generación paralela ni modifica el resultado.

## Runtime evidence

**Trace ID:** `CRPQ-TRACE-HGRM`  
**Previous diagnostic trace:** `CRPQ-TRACE-KHB5`  
**Route:** `/onboarding-test`  
**QA profile:** `daniel falcon g`  
**Created child page:** `8f7a4d9b-6a30-47fe-94c4-c1a42f14edce`

Scenario executed with the authenticated browser session:

- business: `Visual Repair QA`;
- activity: `Peluquería y belleza`;
- goal: `Quiero recibir reservas`;
- service: `Corte y peinado`;
- price: `$18.000`;
- service description: `Servicio premium QA`;
- WhatsApp: `+56912345678`;
- media: skipped explicitly;
- density: `Sencilla`.

The live state sequence was observed as:

`onboarding → GENERATING → PERSISTING → READY → /pages/{pageId}/edit`.

READY showed the real supplied identity, activity, service, price, contact and
the truthful draft message: the page is saved, not published, and has no public
URL yet.

## Actual Engine decisions

| Signal                | Actual runtime value                                                        |
| --------------------- | --------------------------------------------------------------------------- |
| normalized category   | `other` (the activity category still degrades in PAGES_7)                   |
| primary goal          | `booking`                                                                   |
| inferred archetype    | `home_service`                                                              |
| family bias           | active                                                                      |
| selected family       | `corporate`                                                                 |
| recipe/pattern        | `trust_first`                                                               |
| layout                | `executive`                                                                 |
| media strategy        | `minimal-no-media`                                                          |
| hero/banner           | enabled as gradient fallback; no image URL invented                         |
| hero/banner height    | `220px` desktop; mobile derived at approximately `158px`                    |
| background            | linear gradient, `155°`, `#EEF2F7 → #FBFCFE`                                |
| heading typography    | system UI, `40px`, weight `600`, line-height `1.55`, letter-spacing `-0.02` |
| cards                 | `elevated`, radius `10`, border `1`, shadow `md`, padding `20`              |
| buttons               | `solid`, radius `10`, height `54`, weight `650`, shadow `md`                |
| spacing/content width | section `32`, block `14`, content width `640`                               |
| canonical blocks      | `text/default`, `services/cards`, `cta/panel`, `contact/card`               |

Inspector capability capture for this run:

- selected: `card_preset_elevated`, `button_solid`, `layout_executive`,
  `block_text`, `block_services`, `block_cta`, `block_contact`,
  `motion_presets`;
- not selected: `block_hero`, `block_stats`, `block_testimonials`,
  `block_pricing`, `block_faq`, `texture_grain`, `block_gallery`,
  `block_portfolio`, `block_video`;
- unsupported: `multi_stop_gradient`, `background_mesh`, `arbitrary_css`.

The generated background is nevertheless a supported linear gradient. The
Inspector's selected-capability label does not list it because the diagnostic
helper currently emits `background_gradient` while the capability registry
uses `background_linear_gradient`; this is a reporting-label mismatch, not a
rendering loss.

The `home_service` result is the exact archetype captured in this run. It is a
service-class archetype and is not a hairdresser-specific hardcode. The prior
trace had shown the same semantic family of problem under a different input
normalization; the repaired invariant is the preserved booking goal and the
active archetype bias, not a forced archetype name.

## Expected versus actual

| Requirement              | Expected                                          | Actual after repair                                                               | Result |
| ------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------- | ------ |
| Booking semantics        | `bookings → book → booking`                       | `bookings → book → booking`                                                       | PASS   |
| Service card material    | explicit override > theme.cards > variant default | Engine `elevated` theme reached `services`; `minimal` variant no longer erases it | PASS   |
| Hero without owner media | supported premium gradient/hero                   | gradient banner enabled, no fabricated image                                      | PASS   |
| Gradient endpoints       | distinct deterministic endpoints                  | `#EEF2F7` and `#FBFCFE`                                                           | PASS   |
| Background               | archetype-aware supported background              | corporate gradient, 155°                                                          | PASS   |
| Cards                    | elevated/soft/minimal by semantic context         | `elevated`, border and shadow present                                             | PASS   |
| Buttons                  | semantic variant                                  | `solid` for booking/service CTA                                                   | PASS   |
| Catalog behavior         | catalog-first where applicable                    | unchanged and covered by existing retail tests                                    | PASS   |
| Canonical document       | valid and renderer-compatible                     | `validateTemplate` PASS                                                           | PASS   |

## First divergence and root cause

### 1. Booking goal was lost at the PAGES_7 adapter boundary

`GeneratedPageInput` did not carry the request's explicit primary goal. For a
services page, `buildGeneratedPageIntent()` therefore fell back to the legacy
services preset, whose goal was `show_services`; the Engine later normalized
that value to `leads`.

**Repair:** an optional adapter-only `primaryGoal` now carries `bookings` for a
Smart Pages `book` request. `buildGeneratedPageIntent()` uses that value when
present and retains the legacy preset for all other callers. The existing
Engine `PrimaryGoal` value `booking` is reused; no enum or schema was added.

### 2. `ServicesBlock` discarded Engine card material

The renderer-side block had a special `variant === "minimal"` branch that
forced transparent background, zero border and no shadow. That branch ran even
when Engine had authored `theme.cards = elevated`, making the final service
cards look flat.

**Repair:** `ServicesBlock` now delegates card material to the existing
`cardStyle(theme, block.style)` precedence. An explicit `block.style` still
wins; otherwise `theme.cards` wins. The `minimal` variant remains available as
a structural variant and was not removed.

### 3. Hero endpoints were identical

`resolveColors()` assigned the same palette accent to both primary and accent.
The renderer correctly consumed that config, but the resulting hero gradient
was visually flat.

**Repair:** `resolveColors()` selects a different readable value already in the
same palette for the hero accent, deterministically and without adding a new
color dependency. The generated runtime values are now `#EEF2F7` and
`#FBFCFE` for the banner/background gradient.

## Inspector and renderer proof

The Inspector reported these layer outcomes for `CRPQ-TRACE-HGRM`:

- semantics: pass;
- owner content: pass;
- Smart Pages: pass;
- host map: warning only for deferred visual hints;
- PAGES_7: warning for category degradation, while goal was preserved;
- Engine archetype: pass, `home_service`;
- Engine family: pass, `corporate`, family bias active;
- visual authoring: warning only for capabilities not selected by this input;
- contextual media: pass with no owner media fallback image;
- canonical: pass;
- renderer: pass.

The effective rendered service card was inspected in the live `.pts-page`:

`border-radius: 10px; padding: 20px; border-style: solid; border-width: 1px;
border-color: rgb(216,224,234); background-color: rgb(238,242,247);
box-shadow: ...`

This proves that the generated elevated card material reached the renderer.
The explicit-override test also proves that a canonical block style can still
override the Engine theme when the editor intentionally supplies one.

## Persistence and handoff verification

- `PERSISTING` was visible before success.
- Exactly one QA child page was created by this run and retained.
- The created page ID was `8f7a4d9b-6a30-47fe-94c4-c1a42f14edce`.
- Handoff opened exactly:
  `http://localhost:8080/pages/8f7a4d9b-6a30-47fe-94c4-c1a42f14edce/edit`.
- `PowerEditorHost` loaded the new page, not the main profile page.
- The editor displayed `Corte y peinado`, `$18.000` and `+56912345678`.
- After a browser reload, the editor still displayed the supplied service,
  price and phone from the persisted canonical document.
- The duplicate-submit guard is covered by the premium onboarding state test;
  no second page was observed in the single live run.
- No automatic cleanup, SQL deletion, reset or service-role shortcut was used.

The authenticated `/editor` tab was also checked after the successful run: it
remained at `http://localhost:8080/editor` and did not redirect to an onboarding
route. The main editor profile shown there is an existing profile surface; the
created child page remains independently verified at its exact `/pages/{id}/edit`
URL above.

## Tests and build

- Focal regression: **49/49 tests passed** in 5 files.
- Semantic ESLint on the changed implementation/tests: **passed** with the
  repository's Prettier rule disabled; the workspace has unrelated CRLF/format
  drift in many pre-existing dirty files.
- `npm run build`: **passed** for client, SSR and Nitro.
- `git diff --check`: **passed**; only line-ending conversion warnings were
  emitted.
- Post-fix browser console: the tab was visually verified, but the browser
  diagnostic API returned `Debugger unattached`; consequently this report does
  not claim an independently captured zero-error console result.
- An expanded Vitest invocation was started but remained open in the known
  `happy-dom` browser-task behavior and was terminated; it was not counted as a
  pass or failure.

## Files changed by this repair

Implementation deltas:

- `src/lib/page-generator/types.ts` — optional adapter-only `primaryGoal`;
- `src/lib/page-generator/smart-pages-host-map.ts` — booking goal carry-through;
- `src/lib/page-generator/intent.ts` — explicit goal precedence;
- `src/premium-template-studio/components/blocks/PremiumBlocks.tsx` — service
  card material precedence;
- `src/lib/parametric-engine-v2/power-editor/resolvers.ts` — deterministic
  distinct hero accent and archetype-aware output already exercised by runtime.

Targeted contract tests:

- `src/lib/page-generator/__tests__/page-generator.adapter.test.ts`;
- `src/lib/page-generator/__tests__/smart-pages-host-map.test.ts`;
- `src/lib/parametric-engine-v2/__tests__/premium-visual-authoring.test.ts`;
- `src/premium-template-studio/__tests__/visualContract.test.tsx`.

No Smart Pages rewrite, canonical schema change, renderer architecture change,
database migration, dependency or Engine entrypoint replacement was introduced.
Existing dirty-worktree changes from earlier frozen tasks were preserved.

## Architecture gates

- `BOOKING_SEMANTIC_PRESERVED = YES`
- `SERVICES_THEME_CARD_PRECEDENCE = YES`
- `EXPLICIT_BLOCK_OVERRIDE_PRESERVED = YES`
- `DISTINCT_HERO_ENDPOINTS = YES`
- `NO_RANDOM_COLOR_GENERATION = YES`
- `NO_HARDCODED_HAIRDRESSER_RULE = YES`
- `ONE_ENGINE_ENTRYPOINT = YES`
- `CANONICAL_VALIDATION = PASS`
- `PUBLIC_RENDERER_REUSED = YES`
- `QA_PAGE_RETAINED = YES`
- `DATABASE_CLEANUP_PERFORMED = NO`
- `SMART_PAGES_REWRITTEN = NO`
- `CANONICAL_SCHEMA_CHANGED = NO`
- `RENDERER_ARCHITECTURE_CHANGED = NO`
- `DB_MIGRATION_CREATED = NO`
- `GIT_MUTATION_PERFORMED = NO`

## Success gate

`CRIPQER_PREMIUM_VISUAL_RUNTIME_ALIGNMENT_PASS_FROZEN`

No follow-up task was started automatically.
