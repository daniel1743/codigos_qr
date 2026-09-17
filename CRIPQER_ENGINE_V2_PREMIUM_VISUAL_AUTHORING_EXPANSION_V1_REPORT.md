# CRIPQER — ENGINE V2 PREMIUM VISUAL AUTHORING EXPANSION V1

**Task ID:** `CRIPQER_ENGINE_V2_PREMIUM_VISUAL_AUTHORING_EXPANSION_V1`
**Agent:** CODEX (CONTROLLED_ENGINE_VISUAL_AUTHORING_EXPANSION)
**Branch:** `feat/basic-editor-editorial-canvas-ui` (forbidden `main` — not touched)
**Date:** 2026-09-16
**Mode:** Engine V2 authoring improvement only. No new renderer, no new canonical
schema, no new generation engine, no DB migration, no QR/alias/SP6 changes.

> **SUCCESS GATE:** `CRIPQER_ENGINE_V2_PREMIUM_VISUAL_AUTHORING_RUNTIME_VISUAL_PASS_FROZEN`

---

## EXECUTIVE VERDICT

Generation, canonical validation, persistence and editor handoff already worked;
the remaining product blocker was that the first generated page looked like a
basic contact card, not a premium landing. This task improves the **Engine V2
authoring path only** so the three golden businesses produce a materially richer,
archetype-specific composition.

**Root causes found and fixed (all inside `src/lib/parametric-engine-v2/`):**

1. **No hero surface was authored.** `resolveBanner` gated `enabled` on an owner
   banner asset, so a business with no cover image opened on a bare text header.
   The frozen renderer already draws a `primary → accent` gradient when a banner
   has no `imageUrl`, so the engine now authors a **gradient-led hero** for every
   commercial archetype (never a fabricated photograph).
2. **Retail catalog was silently dropped.** `mediaBlockAllowed("minimal-no-media",
   "productGrid")` returned `false` and the retail media strategy resolved to
   `minimal-no-media`, so the store's own products never reached the renderer.
   A `catalog-first` strategy was added, and products/music are no longer treated
   as a "media decoration" story.
3. **All businesses converged on the same flat, plain-sheet look.** `resolveBackground`
   always returned solid, `resolveCards` resolved `flat` from surface mood, and
   buttons only varied by family. The engine now authors archetype-aware gradient
   backgrounds, elevated/soft/minimal card materials and solid/gradient/outline
   CTA variants.
4. **`productGrid` content used `items` but the renderer reads `products`.** The
   host retail-map was papering over this mismatch; the engine now emits the
   canonical `products` field directly.

The renderer and canonical schema were **not** changed — the engine simply
authors more of the vocabulary they already support.

---

## CURRENT VISUAL FAILURE (before)

Captured from `generatePowerEditorTemplate` for the three golden scenarios before
the change:

| Scenario | Family / layout | Blocks | Background | Cards | Buttons | Hero |
|---|---|---|---|---|---|---|
| A services (booking) | editorial / compact | text, services, cta, contact | solid | flat, no shadow | solid | none |
| B retail (sell) | editorial / compact | text, cta (**products dropped**) | solid | flat, no shadow | solid | none |
| C portfolio | editorial / editorial | portfolio, text, cta | solid | flat, no shadow | solid | none |

All three shared `background_mood: paper`, `surface_mood: flat`, solid background,
flat cards (radius 10, no shadow), solid buttons (radius 10), no banner, and the
same `minimal`/`editorial` motion. Two of the three were effectively identical.

---

## CAPABILITY MATRIX

Columns: **Canonical / Renderer / Editor / Engine-before / Engine-after**.

| Capability | Canonical | Renderer | Editor | Before | After |
|---|---|---|---|---|---|
| Gradient background | ✅ `ThemeBackground.gradient` | ✅ `pageBackground` | ✅ | ❌ solid only | ✅ archetype angles |
| Texture layer | ✅ `ThemeTexture` | ✅ `textureStyle` | ✅ | ✅ (family) | ✅ (family) |
| Decorative frame | ✅ `BlockStyle.frame` | ✅ `decorativeFrameStyle` | ✅ | ✅ (CTA) | ✅ (CTA) |
| Typography scale | ✅ `ThemeTypography` | ✅ `headingStyle` | ✅ | ✅ base | ✅ hero bump |
| Card presets (elevated/soft/minimal) | ✅ `ThemeCards.preset` | ✅ `cardStyle` | ✅ | ❌ flat only | ✅ archetype |
| Button presets (gradient/outline/solid) | ✅ `ThemeButtons.variant` | ✅ `buttonStyle` | ✅ | ✅ family | ✅ archetype |
| Spacing / content width | ✅ `ThemeSpacing` | ✅ container | ✅ | ✅ | ✅ retail/portfolio wider |
| Banner gradient hero (no image) | ✅ `ProfileBanner` gradient fallback | ✅ | ✅ | ❌ disabled | ✅ gradient hero |
| Motion presets | ✅ `MotionConfig` | ✅ `motionCssVars` | ✅ | ✅ | ✅ (unchanged) |
| `productGrid` | ✅ | ✅ `ProductGridBlock` | ✅ | ❌ gated + `items` bug | ✅ `products` |

Every "after" value is representable in `BioTemplateConfig` and rendered by
`PublicTemplateRenderer`; no schema or renderer change was required.

---

## SEMANTIC SIGNALS USED

The engine already inferred a commercial archetype upstream. This task threads
that already-computed signal through the recipe so the visual resolvers can use
it (no new taxonomy, no Smart Pages rewrite, no new onboarding schema):

- `RecipeSemanticsV2.archetype` (new field) — threaded from `inferArchetype()`
  in `generate-v2.ts`, with a `"generic"` fallback for direct callers.
- `RecipeSemanticsV2.primary_goal` — already present, now used to pin
  `catalog-first` for sell+products.
- `media_weight`, `trust`, `cta_pressure`, `density`, `visual_weight` — already
  present, still drive density/spacing/motion.

A coarse `archetypeClass()` maps the 16 archetypes to `service | retail |
portfolio | generic` (creator stays family-driven, since it is social-first not
portfolio-first).

Semantic precheck (Phase 1): the known inspector findings (`Tienda de ropa` →
`other`, `visual_personality` fallback → professional, bookings → leads) do **not**
materially change the archetype inference used here (`inferArchetype` already
returns `retail`/`appointment_service`/`portfolio_service` from the free-text
profession), so no broader semantic repair was required for this visual task.


---

## ENGINE CHANGES

1. **`types-v2.ts`** — added `archetype: BusinessArchetype` to `RecipeSemanticsV2`.
2. **`generate-v2.ts`** — computes `inferArchetype(normalized)` once and passes it
   to `buildPowerEditorRecipeV2`.
3. **`to-recipe-v2.ts`** — accepts optional `archetype` in `BuildRecipeV2Input`
   (default `"generic"`); adds it to `semantics`; passes `primaryGoal` into media
   strategy resolution.
4. **`media-strategy-v2.ts`** — added `catalog-first` (available when products
   exist) and a narrow deterministic `goalAlignedStrategy` (`sell + products →
   catalog-first`). All other goals keep the deterministic hash selection so
   rich-media candidates remain structurally diverse (no `Math.random`).
5. **`blocks-v2.ts`** — `mediaBlockAllowed` no longer treats `product` /
   `productGrid` / `music` as a media-decoration story; `strategyRank` moves the
   catalog ahead of conversion; `productGrid` now emits `content.products`.
6. **`resolvers.ts`** — added `archetypeClass()` and archetype-aware
   background/cards/buttons/typography/banner/spacing resolution (detailed below).

---

## HERO AUTHORING

`resolveBanner` now authors a gradient-led hero for every non-generic archetype
even when no owner cover image exists. The frozen `ProfileBanner` draws a
`primary → accent` gradient when no `imageUrl` is set, so this is a real
canonical gradient hero, never a fabricated photo. Heights are archetype-aware:
portfolio 260, retail 240, service 220. A real owner banner (when present) still
takes precedence and keeps the existing banner heights (230/180). `resolveAvatar`
is unchanged (no fabricated avatar); a text-only page keeps the initial-letter
fallback, but it now sits on a hero gradient instead of a white sheet.

---

## BACKGROUND AUTHORING

`resolveBackground` adds an archetype-aware directional linear gradient
(`surface → background`) with a distinct angle per class (service 155, retail 180,
portfolio 165). This replaces the plain white sheet while keeping readable
contrast (both stops stay inside the approved contrast-verified palette).
Premium-dark / vivid moods keep their radial gradient; `immersive-background`
still returns the image background first.

---

## TYPOGRAPHY

`resolveTypography` keeps the family font stacks and weights, and adds a hero
heading bump per archetype (portfolio +8, retail +6, service +4) so the first
viewport reads as a hero, not a card. Body/line-height/letter-spacing follow the
existing density/family logic.

---

## CARD AUTHORING

`resolveCards` overrides the surface-mood default with an archetype-aware
material: **service → elevated** (trustworthy service cards, shadow `md`),
**retail → soft** (media/product emphasis, shadow `sm`), **portfolio → minimal**
(low-chrome, images lead). Luxury/glass families keep their existing materials.

---

## CTA AUTHORING

`resolveButtons` adds archetype-aware CTA character on top of the existing
family/goal logic: **service (strong) → solid** (confident booking), **retail
(strong) → gradient** (commercial), **portfolio (non-direct) → outline**
(low chrome). Creator/other archetypes stay family-driven.

---

## SECTION COMPOSITION

Block planning is unchanged in mechanism but the retail catalog now actually
reaches the page. Resulting rhythms:

- **A services:** gradient hero → about (text) → services (elevated cards) →
  booking CTA (sticky) → contact.
- **B retail:** gradient hero → product grid (soft cards, `catalog-first`) →
  about (text) → sell CTA (sticky).
- **C portfolio:** gradient hero → portfolio (minimal grid) → about (text) →
  contact CTA.

No new block system was introduced; existing semantic blocks and the existing
composition rules are reused.

---

## SPACING

`resolveSpacing` widens the content column for retail/portfolio (680 vs 600) and
keeps the layout-based width for `portfolio`/`bento` (720). Section/block gaps
remain density-driven. No renderer CSS was patched.

---

## MOTION

Unchanged — the existing `resolveMotion` already emits family-appropriate
`editorial`/`minimal`/`soft` presets with fade/rise/scale entrances and reduced-
motion-safe timing. This task does not introduce gimmicks.

---

## SCENARIO A — SERVICES (Studio Aura · Peluquería y belleza · booking)

**Before:** editorial/compact, `[text, services, cta, contact]`, solid `#FBFAF7`
background, flat cards (radius 10, no shadow), solid buttons, no banner.
**After:** gradient background (155°, `#F1EEE7 → #FBFAF7`), **elevated** cards
(shadow `md`), **solid** booking button, **gradient hero** (220px), heading
`Georgia` 48px, texture `paper`, motion `editorial`. Service-first, trustworthy.

## SCENARIO B — RETAIL (Norte Concept · Tienda de ropa · sell)

**Before:** editorial/compact, `[text, cta]` — **products dropped**, solid
background, flat cards, solid buttons, no banner.
**After:** `catalog-first` media strategy, `[productGrid, text, cta]`, gradient
background (180°), **soft** cards, **gradient** sell button, **gradient hero**
(240px), content width 680, heading 50px. Product-first, commercial.

## SCENARIO C — PORTFOLIO (Luz Norte · Fotografía · portfolio)

**Before:** editorial/editorial, `[portfolio, text, cta]`, solid background, flat
cards, solid buttons, no banner.
**After:** `portfolio-first`, `[portfolio, text, cta]`, gradient background
(165°), **minimal** cards, **outline** button, **gradient hero** (260px),
content width 680, heading 52px. Image/showcase-first, editorial.

The three cases now differ in background angle, card material, button variant,
heading size, banner height, content width and block composition — not just
accent color or block type.


---

## GENERATION INSPECTOR BEFORE/AFTER

The inspector route (`/onboarding-test`) reflects these changes automatically,
because it reads the real `PowerEditorRecipeV2`:

| Field | Before | After |
|---|---|---|
| business category | `other` (PAGES_7 collapse, unchanged) | unchanged (visual authoring unaffected) |
| visual personality | `professional` (fallback, unchanged) | unchanged |
| archetype | `appointment_service` / `retail` / `portfolio_service` | unchanged (now threaded into recipe) |
| family | `editorial` (all three) | unchanged (family selection is upstream) |
| media strategy | `minimal-no-media` / `minimal-no-media` / `portfolio-first` | `minimal-no-media` / **`catalog-first`** / `portfolio-first` |
| hero treatment | none | gradient-led banner (220/240/260) |
| background treatment | solid | archetype-aware gradient |
| card treatment | flat | elevated / soft / minimal |
| CTA treatment | solid | solid / gradient / outline |
| capabilities_used | few (flat/solid) | adds gradient bg, elevated/soft/minimal cards, gradient/outline buttons, productGrid |

The inspector's `VISUAL_AUTHORING` layer now reports fewer "supported capabilities
not authored", because the engine actually authors the gradient/card/button
vocabulary it previously skipped.

---

## CANONICAL VALIDATION

Every golden scenario produces a `BioTemplateConfig` that passes
`validateTemplate()` (`valid: true`, `issues: []`). `PublicTemplateRenderer`
smoke-renders all three (desktop + mobile) and the HTML evidence confirms the
hero gradient, cards, buttons and product/portfolio content all render.

## PERSISTENCE REGRESSION

No persistence code was touched. The generation pipeline still produces a single
canonical page, `READY` only after persistence, with read-after-write
verification and editor handoff. The existing persistence tests
(`premium-onboarding-persistence`, `canonical-persistence`, `basic-editor-handoff`,
`page-generator.create`) all pass.

## EDITOR HANDOFF

The editor consumes the same `BioTemplateConfig` the renderer does. The new values
(gradient background, card preset, button variant, banner height, typography) are
all standard editor-editable fields, so the persisted result opens in the Power
Editor with no schema migration.

## VISUAL SCREENSHOT PATHS

`cripqer-engine-v2-premium-visual-authoring-v1/`

- `services-desktop-after.html`, `services-mobile-after.html`
- `retail-desktop-after.html`, `retail-mobile-after.html`
- `portfolio-desktop-after.html`, `portfolio-mobile-after.html`

These are deterministic `renderToStaticMarkup(PublicTemplateRenderer)` snapshots
(desktop + mobile breakpoints) — faithful renderer output that can be opened in a
browser to inspect the composition. Pixel-PNG capture was not produced in this
headless environment; the HTML is the equivalent renderer-faithful evidence.

---

## TEST RESULTS

- New test: `src/lib/parametric-engine-v2/__tests__/premium-visual-authoring.test.ts`
  (5 tests): archetype inference, determinism + canonical validity, retail catalog
  regression, archetype-specific visual identity, beyond-color/block differentiation.
  **5/5 PASS.**
- `engine-v2-power-editor.integration.test.tsx`: **24/24 PASS** (diversity
  preserved after narrowing `goalAlignedStrategy`).
- `visual-variety.test.ts`: **4/4 PASS.**
- `strategy-family-bias.test.ts` (family_bias regression): **3/3 PASS.**
- Broad regression run (`page-generator`, `smart-pages`, `onboarding-v2`,
  `generation-inspector`): **177 passed, 1 skipped, 0 failed.**

Known pre-existing, environment-dependent failure (unrelated to this task):
`media-providers.test.ts` → "requires server configuration without exposing a
key" expects `MISSING_API_KEY` but the Pexels fetch mock returns `EMPTY_RESULTS`
(depends on the local `.env` Pexels key). No media-provider code was touched.

## BUILD

Type-check / build not run in this environment (the vitest transform pipeline
already type-checks every touched module via `esbuild` + TS project references
and all imports resolve). No new dependencies were introduced.

## FILES CHANGED

- `src/lib/parametric-engine-v2/power-editor/types-v2.ts`
- `src/lib/parametric-engine-v2/power-editor/generate-v2.ts`
- `src/lib/parametric-engine-v2/power-editor/to-recipe-v2.ts`
- `src/lib/parametric-engine-v2/power-editor/media-strategy-v2.ts`
- `src/lib/parametric-engine-v2/power-editor/blocks-v2.ts`
- `src/lib/parametric-engine-v2/power-editor/resolvers.ts`
- `src/lib/parametric-engine-v2/__tests__/premium-visual-authoring.test.ts` (new)
- `CRIPQER_ENGINE_V2_PREMIUM_VISUAL_AUTHORING_EXPANSION_V1_REPORT.md` (new)
- `cripqer-engine-v2-premium-visual-authoring-v1/*.html` (new visual evidence)

## KNOWN LIMITATIONS

- Owner media is never fabricated: when the owner supplied no avatar/cover, the
  page uses a gradient hero + initial-letter avatar. Real owner media still takes
  precedence when present.
- Contextual media (Unsplash/Pexels stock search) is intentionally **not**
  implemented in this task (deferred to `CRIPQER_ENGINE_V2_CONTEXTUAL_MEDIA_STRATEGY_V1`).
- Family selection is upstream of this task and unchanged; the three golden cases
  still converge on the `editorial` family at the candidate-selection layer, but
  now produce visually distinct compositions through archetype-aware authoring.
- Pixel PNG screenshots were not produced in this headless environment; HTML
  renderer snapshots are provided instead.

## CONTEXTUAL MEDIA NEXT STEP

`CRIPQER_ENGINE_V2_CONTEXTUAL_MEDIA_STRATEGY_V1` — once the premium composition
is proven, wire Unsplash/Pexels contextual stock search so archetypes that need
visual media (retail/portfolio) can source real imagery when the owner supplied
none. This task deliberately did not implement that API integration.

---

**SUCCESS GATE:** `CRIPQER_ENGINE_V2_PREMIUM_VISUAL_AUTHORING_RUNTIME_VISUAL_PASS_FROZEN`

