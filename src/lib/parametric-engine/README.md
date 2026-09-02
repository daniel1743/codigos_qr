# CRIPQER PARAMETRIC DESIGN ENGINE V1

Deterministic, pure-TypeScript engine that converts an approved
`OnboardingIntentV1` into a validated `PageRecipeV1`.

It is **not** a template gallery, **not** an AI layer, and **not** a renderer.
It produces intent-driven design *parameters*; a renderer maps them to
`--tpl-*` tokens.

## Guarantees

- Pure and synchronous. No network, DB, DOM, storage, AI or analytics.
- Deterministic: same intent + same options -> byte-identical recipe
  (except `meta.generated_at`, which never influences any parameter).
- No randomness, no `Math.random`, no date-derived design decisions.
- Output is deep-frozen and JSON-serializable (no functions, DOM nodes,
  or `blob:` URLs).
- Every recipe passes full validation before it is returned; an invalid
  recipe throws instead of shipping.
- Never emits raw CSS, arbitrary fonts, arbitrary colors, or Cripqer
  platform tokens (`--brand-*`, `--surface-*`).

## API

```ts
import {
  generatePageRecipe,     // throws EngineError
  tryGeneratePageRecipe,  // EngineResult<PageRecipeV1>
  generateWithTrace,      // + normalized intent, profile, downgrades (QA only)
  validatePageRecipe,
  normalizeIntent,
  DEFAULT_CAPABILITIES,
} from "@/lib/parametric-engine";

const recipe = generatePageRecipe(intent, {
  capabilities: { media_block: false }, // partial renderer overrides
  overrides: {                           // explicit user control
    hero_mode: "banner_avatar",          // avatar_only | banner_only | banner_avatar
    links_presentation: "cards",         // buttons | cards | mixed
    identity_alignment: "left",
    density: "balanced",
    card_media_position: "bottom",
    visual_family: null,                 // FamilyId | null
    locked: ["links_presentation"],      // survives regeneration + variants
  },
  variant: 0,                            // deterministic alternate variant
  now: "2026-01-01T00:00:00.000Z",       // pin the timestamp in tests
});
```

## User control (DesignOverridesV1)

- Any undefined key stays fully engine-driven.
- Overrides are applied after composition and before compatibility, so the
  capability registry always has the final word on what can be rendered.
- Keys listed in `locked` are re-applied after compatibility whenever the
  renderer supports them: a locked preference survives regeneration and any
  deterministic variant change.

## Hero modes and asset presence

`structure.hero.mode` expresses composition *intent*
(`avatar_only` / `banner_only` / `banner_avatar`), while `show_avatar` and
`show_banner` reflect actual asset availability. The engine never invents or
persists image URLs. A temporary `blob:` avatar counts as present for
composition (`assets.has_avatar`) but is never serialized into the recipe.
Identity avatars are never treated as card media: card media requires an
explicit `assets.card_media` declaration, otherwise
`design.card.media_position` is `"none"`.

## Destination validation

The engine never trusts UI gating. Malformed destinations are rejected as
`INVALID_INTENT` (no dependencies, lightweight TypeScript only):
WhatsApp 8-15 normalized digits, website/booking valid `http(s)` URLs,
Instagram a supported handle or profile URL, email a valid address.

## Deterministic variants

`variant` may change family (only among the three highest-scoring, still
compatible families), hero composition, link presentation, alignment,
density and card media strategy — never randomly: same intent + same
overrides + same variant always yields the same recipe. `variant: 0` is the
canonical baseline used by the fixtures.

## Self-check

```ts
import { runEngineSelfCheck } from "@/lib/parametric-engine";
const { passed, failed, failures } = runEngineSelfCheck();
```

## Pipeline

```
intent -> validateIntent -> normalizeIntent -> buildDesignProfile
       -> selectFamily -> resolveDesign -> composeStructure
       -> composeBlocks -> applyCompatibility -> composeConversion
       -> validatePageRecipe -> deepFreeze
```

| Module | Responsibility |
|---|---|
| `types.ts` | Contracts, enums, `EngineError` |
| `normalize.ts` | Intent validation, alias mapping, trimming, avatar safety |
| `strategy.ts` | Weighted scoring: energy, trust, media weight, CTA pressure |
| `families.ts` | Six controlled parameter strategies + fixed tie-break order |
| `palettes.ts` / `typography.ts` | Approved, contrast-checked value registries |
| `rules.ts` | Parameter resolution and semantic composition |
| `capabilities.ts` | What the current renderer can actually render |
| `compatibility.ts` | Deterministic downgrades; never silent breakage |
| `overrides.ts` | User design control + locking |
| `destinations.ts` | Dependency-free destination validation |
| `validator.ts` | Shape, enums, contrast, order, serialization |
| `engine.ts` / `index.ts` | Pipeline and stable public surface |

## Families

`editorial`, `luxury`, `corporate`, `minimal`, `creator`, `energetic`.
Families are parameter strategies, not page templates. Personality is one
input among several — there is no 1:1 personality-to-family mapping.

## Renderer contract

The renderer consumes `recipe.design` (palette, typography, geometry,
background, button, card, spacing), `recipe.structure`, and
`recipe.blocks` in the given `order`. It must:

1. Map palette/typography/geometry to `--tpl-*` tokens only.
2. Render blocks in array order and skip nothing.
3. Treat `structure.primary_action` as the single dominant conversion path.
4. Never re-derive design decisions locally.

If the renderer gains or loses a capability, update `capabilities.ts` —
never patch the recipe after generation.

## Compatibility and downgrades

Unsupported features degrade deterministically: gradients fall back to
solid, professional cards to buttons, unsupported/reserved blocks are
removed, image-dependent media without an image is dropped, and a primary
CTA is always restored if a downgrade removed it. Each downgrade is
reported through `generateWithTrace().trace.downgrades`.

## Accessibility

Every emitted palette is contrast-checked at generation time
(text/background, text/surface, muted text, and CTA label on accent all
>= 4.5:1). A failing palette is replaced by the safe palette rather than
shipped. Layouts stay viable at 320px (compact horizontal padding is
rejected by the validator).

## Future AI boundary

An AI layer may only **choose or refine inputs** to this engine — that is,
propose an intent or select a variant index. It must never emit CSS,
colors, fonts, block structures or recipes directly. The engine remains
the single deterministic authority.

## Safe extension

- Add a palette or typography pair to the approved registries.
- Add a family to `families.ts` and `FAMILY_PRIORITY`.
- Add a capability flag plus its downgrade path.
- Add a block type to `SUPPORTED_BLOCK_TYPES` plus composition + validation.

## Forbidden

Raw CSS strings, arbitrary hex from user input, platform brand tokens,
randomness, date/locale-dependent output, network or storage access,
mutating a returned recipe, or bypassing `validatePageRecipe`.

## Fixtures

`fixtures/intents.ts` holds 10 sample intents plus one malformed intent;
`fixtures/expected-recipes.ts` holds the expected decision summaries.
They are test coverage, never a production catalog.

---

## V1.5 — FUTURE CAPABILITY RESERVE (additive, backward compatible)

`generatePageRecipe(intent)` with no options is **unchanged**: same families,
same parameters, same blocks, same validation. Everything below is optional
and only activates when explicitly supplied.

### Optional context

```ts
generatePageRecipe(intent, {
  context: {
    business: { archetype: "home_service", urgency: "high" },
    content: { services: { available: true, count: 6 } },
    goals: { secondary: "leads" },
    future_capabilities: {},           // all false by default
  },
});
```

Context influences composition ONLY through parameters the current recipe
contract already supports (hero mode, alignment, links presentation,
density, block order). It can never emit an unsupported feature.

### Modules

| Module | Purpose |
| --- | --- |
| `business-signals.ts` | Archetype/goal-stack inference (16 archetypes, no profession spaghetti) |
| `archetypes.ts` | Strategy packs: family bias, patterns, weights |
| `content-inventory.ts` | Availability + counts only, never user content |
| `composition-patterns.ts` | 10 semantic composition grammars |
| `design-axes.ts` | Family-safe allowed values per design axis |
| `palettes-extended.ts` | Advanced palette bank, contrast-verified |
| `presets.ts` | Named safe override bundles |
| `candidates.ts` | Deterministic N-candidate generation + ranking |
| `quality-score.ts` | Heuristic score (NOT objective aesthetic truth) |
| `diversity.ts` | Structural signature + anti-duplication selection |
| `refinements.ts` | Semantic commands ("calmer", "bolder", ...) |
| `control-catalog.ts` | Serializable editor control metadata |
| `fingerprint.ts` / `recipe-diff.ts` | Version safety, stored-recipe compatibility, semantic diff |
| `future-capabilities.ts` | All future flags default `false` |
| `future-blocks.ts` / `future-plan.ts` | Dormant block strategies + planning contract |
| `conversion-patterns.ts` | Current/future conversion strategies with fallback |
| `responsive.ts` / `motion.ts` | Dormant contracts; return `null` unless declared |

### Unsupported feature isolation

Future blocks, responsive strategies and motion tokens are **never** written
into `PageRecipeV1`. They live in separate planning objects and stay dormant
until a renderer declares the matching capability.

### Quality score disclaimer

`RecipeQualityScoreV1` is a deterministic heuristic used for ranking
candidates. It is not a claim of objective aesthetic quality.

### Self-check

```ts
import { runEngineSelfCheck, runEngineSelfCheckV15 } from "@/lib/parametric-engine";
runEngineSelfCheck();     // 61 V1 assertions
runEngineSelfCheckV15();  // V1 gate + 21 V1.5 assertions
```
