# CRIPQER — Engine V2 Generation Quality & Composition Forensic Report

## Executive verdict

**P1_ENGINE_GENERATION_QUALITY: ROOT_CAUSE_IDENTIFIED**

The poor page is not a Basic Editor rendering defect. It is a deterministic Engine V2 composition failure with three interacting causes:

1. The Onboarding V2 adapter loses the selected business category and does not materialize selected content capabilities as `ContentSourceV2`.
2. `scope.density=auto` is recorded only as a diagnostic and the V2 recipe builder collapses content with no concrete entries to `compact`.
3. The no-CTA value is converted to the legacy-safe sentinel `website/#`, then the planner always emits an enabled CTA. The public renderer therefore displays `Cuéntanos tu proyecto / Visitar`.

Internal branding is a separate production contract leak: the generated config sets `settings.showBranding=true`, and the canonical renderer prints the Premium Template Studio footer whenever that flag is true.

No code was modified during this audit.

## Exact runtime trace

Fixture: `daniel falcon`, `asesor de bienestar`, category `beauty`, goal `presence`, style `premium`, capabilities `links/products/social_networks/services`, primary action `null`, density `auto`, no media.

### Onboarding adapter output

The actual `EngineV2HostGenerationInput` was:

```json
{
  "profession": "asesor de bienestar",
  "businessOther": "asesor de bienestar",
  "goal": "leads",
  "style": "premium",
  "selectedFeatures": ["links", "products", "social", "services"],
  "content": {
    "name": "daniel falcon",
    "bio": "te asesoro con profesionalismo"
  }
}
```

The input is **INPUT_MAPPING_LOSS**, not input-thin:

- `business.category=beauty` is not mapped into the engine input.
- `contentNeeds` becomes `selectedFeatures`, but `internal-entrypoint.ts` only reads `content.name`, `content.bio` and concrete `content.links`.
- There are no concrete products, services, social URLs or link URLs, so no corresponding `ContentSourceV2` entries exist. This is correct content-availability gating, but the selected capabilities are not used to request deferred structural slots.
- `scope.density=auto` is added to adapter diagnostics only; it is not present in `EngineV2HostGenerationInput`.
- `actions.primary=null` is correctly diagnosed as explicit no-CTA at the adapter boundary, but the downstream V1 contract does not preserve that state.

## Candidate generation and winner

Using the exact mapped V1 input and host content (`about` only):

| Metric | Observed value |
|---|---:|
| Evaluated candidates | 52 |
| Returned candidates | 3 |
| Rejected candidates | 2 (`duplicate`) |
| Winner | `clean_professional#1.0` |
| Winner preset | `clean_professional` |
| Winner family | `corporate` |
| Winner pattern | `trust_first` |
| Winner layout | `executive` |
| Winner score | 87 |
| Winner recipe blocks | `text`, `cta` |
| Winner canonical blocks | 2 |
| Winner density | `compact` |
| Winner visual weight | `medium` |

The selected candidates were:

| Candidate | Score | Family | Pattern | Layout | Blocks |
|---|---:|---|---|---|---|
| `clean_professional#1.0` | 87 | corporate | trust_first | executive | text, cta |
| `clean_professional#2.0` | 87 | corporate | trust_first | executive | text, cta |
| `engine#2.0` | 87 | editorial | conversion_first | compact | text, cta |

The winner was not objectively the sparsest candidate among the returned set; all three were materially sparse and tied at 87. Richer candidates were not generated from the onboarding request because no concrete rich content was passed to the planner. The scoring system then ranked mostly generic recipe properties: accessibility 100, business fit 80, conversion fit 85, content fit 70, hierarchy 95, mobile viability 85, visual coherence 80 and capability fit 100.

The score does not reward requested-but-unpopulated capabilities. Its `content` context is empty because `generateCandidateSet` receives no content inventory from the host, and `scoreRecipe` has no selected-feature richness term. This makes an identity-plus-CTA recipe score as high as alternatives without meaningful sections.

## Winning recipe trace

The exact selection path is:

1. `src/lib/onboarding-v2/engine-v2-adapter.ts` maps `presence → leads`, `premium → premium`, and content needs to tokens.
2. `src/lib/parametric-engine-v2/internal-entrypoint.ts` builds the V1 intent. It uses profession as `business_type`, derives `primary_action`, and only maps concrete bio/links into content.
3. `src/lib/parametric-engine-v2/normalize.ts` maps the unrecognized business type to `other`, then `business-signals.ts` keyword matching finds `asesor` and selects `professional_service`.
4. `src/lib/parametric-engine-v2/candidates.ts` explores the baseline plus preset/variant/axis combinations, evaluates 52 valid unique recipes and ranks by `scoreRecipe`.
5. `clean_professional#1.0` forces the corporate family through its preset and resolves to `trust_first` / `executive`.
6. `src/lib/parametric-engine-v2/power-editor/to-recipe-v2.ts` calls `contentDensityOf`; with no rich sections and zero action items, it returns `compact`.
7. `src/lib/parametric-engine-v2/power-editor/blocks-v2.ts` plans the supplied `about` as one `text` block and always pushes one `cta` block.
8. `src/lib/parametric-engine-v2/power-editor/to-template-config.ts` converts the recipe and sets `settings.showBranding=true`.

## Block capability matrix

| Requested capability | Source data available | Block planned | Block generated | Reason |
|---|---|---|---|---|
| identity | name, profession, avatar absent | renderer profile header | visible automatic profile header | `block_hero` intentionally skipped because renderer composes profile header |
| bio | concrete bio | `text` | `text-0` | available as `content.about` |
| services | no service entries; only selected feature token | no | no | `content.services` absent; skipped as `no_services_content` |
| products | no product entries; only selected feature token | no | no | `content.products` absent; no fabricated products |
| links | no concrete URLs | no | no | `content.links` absent |
| social_networks | no concrete social URLs | no | no | `content.socials` absent |
| media | no avatar/banner/media asset | no media block | no | `no_banner_asset`; no concrete media source |
| CTA | explicit primary action null | `cta` | `cta-1` | planner always emits CTA; downstream sentinel becomes `website/#` |
| trust | no badges/testimonials/trust facts | no | no | no concrete proof content |
| footer | renderer setting enabled | renderer footer | visible | `showBranding=true` adds internal footer automatically |

The requested services/products/social/links were not silently fabricated; their concrete data was absent. However, the engine also ignored the semantic request for richer deferred structure, because selected features never reach the planner as availability or slot requirements.

## Premium semantics

`visualDirection.preference=premium` is mapped to `style=premium` and affects:

- family scores: luxury +36, editorial +18, corporate +10;
- visual energy: 45 before goal/category composition;
- downstream family-dependent tokens if the luxury family wins.

For this fixture, premium is a **PARTIAL / WEAK SIGNAL**. The winner is corporate because the `clean_professional` preset forces that family; the baseline family score also favors corporate by a narrow margin after the category resolves to `other`. The winning output therefore receives no luxury dark mood, no luxury texture, no luxury frame and no high visual weight. It gets a solid background, medium visual weight, compact spacing and soft cards.

| Premium dimension | Winner effect |
|---|---|
| layout complexity | none; executive layout remains a single-column identity/conversion shell |
| section richness | none |
| spacing | compact due content-density rule |
| typography | corporate/system-safe typography |
| media | none; no asset and no content strategy input |
| frames | no meaningful primary content frame |
| textures | none; `family_material_is_flat` |
| cards | soft preset |
| shadows | small card shadow / medium button shadow |
| motion | minimal preset, soft-scale hover |
| composition density | compact |

## Density semantics

`scope.density=auto` does not resolve through an explicit V2 density resolver. The adapter writes only `scope.density=auto -> Engine V2 defaults` to diagnostics. The recipe builder then independently computes density from content:

```text
richSections = 0
actionCount = 0
contentDensityOf(...) => compact
```

This is a **DENSITY_RESOLUTION_PROBLEM**. Four selected capabilities plus premium should reasonably produce a richer composition scaffold—even when actual products/services/social URLs are unavailable—or explicitly produce deferred empty-state slots. The current implementation instead treats the absence of concrete content as a reason to collapse the page.

## No-CTA trace

| Stage | Value |
|---|---|
| Onboarding | `actions.primary = null` |
| Adapter | primary action omitted; diagnostic says explicit no-CTA |
| `internal-entrypoint.ts` | `actionFor` returns `null` because there are no concrete links |
| `normalize.ts` | `null` becomes `{ type: "website", value: "#" }` |
| `rules.ts` | `primary_action.enabled` is always `true`; label resolves to `Visitar` |
| `blocks-v2.ts` | always pushes `cta`; headline for `leads` is `Cuéntanos tu proyecto` |
| Final block | `cta-1`, variant `panel`, destination `#` |

Verdict: `CTA_FABRICATED: YES`, `PLACEHOLDER_HASH_USED_VISIBLY: YES`, `DEMO_CONTENT_LEAK: NO` for this block. It is a real generated CTA block, but it violates explicit Sin CTA and uses the placeholder destination visibly.

## Branding trace

`src/lib/parametric-engine-v2/power-editor/to-template-config.ts` sets:

```text
settings.showBranding = true
```

`src/premium-template-studio/engine/TemplateRenderer.tsx` automatically renders `Made with Premium Template Studio` whenever that setting is true. The text is not in the Engine block plan, but the generated config enables it and the renderer adds it.

Verdict: `INTERNAL_BRANDING_LEAK: YES`. This is a production contract leak, not a demo recipe leak.

## Real recipe or demo/default leakage?

The page is a real Engine V2 recipe with a genuine preset (`clean_professional`), deterministic fingerprint and canonical config. It is not a playground/demo recipe. However, it is effectively a default/fallback-dominated output because:

- candidate selection explores presets rather than onboarding capability requirements;
- selected features are not converted into concrete content inventory or deferred sections;
- the scoring model evaluates no selected-feature fulfillment;
- the host does not pass business category or density semantics into the engine contract;
- the renderer header is reused while the actual planned block list contains only bio and CTA.

## Evidence table

| Layer | Observed value | Expected value | Result | Evidence |
|---|---|---|---|---|
| Onboarding intent | beauty, premium, four needs, no CTA, auto | preserved semantic intent | FAIL | adapter output loses category/density semantics and content needs become tokens only |
| Engine input | profession-based input, `goal=leads`, no concrete rich content | category + capabilities represented | FAIL | `engine-v2-adapter.ts`, `internal-entrypoint.ts` |
| Density resolution | compact | richer scaffold for premium + four needs | FAIL | `contentDensityOf` in `to-recipe-v2.ts` |
| Premium mapping | style token and family bias only | materially premium composition | PARTIAL | `strategy.ts`, `resolve*` functions |
| Candidate generation | 52 evaluated, 3 selected | candidates covering capability richness | FAIL | `candidates.ts` |
| Candidate scoring | winner score 87; generic dimensions tie | selected-feature fulfillment | FAIL | `quality-score.ts` |
| Winning recipe | clean_professional#1.0 / corporate / trust_first / executive | premium professional landing | FAIL | deterministic runtime trace |
| Block planning | text + cta | identity/about plus meaningful requested structure | FAIL | `blocks-v2.ts` |
| No-CTA handling | cta `Visitar` to `#` | no CTA | FAIL | `normalize.ts`, `rules.ts`, `blocks-v2.ts` |
| Branding | internal footer visible | no internal branding in production | FAIL | `to-template-config.ts`, `TemplateRenderer.tsx` |
| Final BioTemplateConfig | valid canonical config, 2 blocks + renderer header | rich canonical landing | FAIL | `to-template-config.ts`, runtime output |

## Classification

- `ONBOARDING_SIGNAL_GAP`
- `INPUT_MAPPING_LOSS`
- `CONTENT_AVAILABILITY_POLICY`
- `DENSITY_RESOLUTION_PROBLEM`
- `PREMIUM_SIGNAL_TOO_WEAK`
- `SCORING_PROBLEM`
- `RECIPE_SELECTION_PROBLEM`
- `BLOCK_PLANNER_PROBLEM`
- `DEFAULT_FALLBACK_DOMINANCE`
- `CTA_PLACEHOLDER_LEAK`
- `INTERNAL_BRANDING_LEAK`

Primary root cause: **ONBOARDING_SIGNAL_GAP + INPUT_MAPPING_LOSS**, because the semantic request does not reach the generation contract as category, density or capability availability.

Secondary root causes: **CTA_PLACEHOLDER_LEAK**, **INTERNAL_BRANDING_LEAK**, and scoring/planning rules that equate missing concrete data with a compact page rather than preserving requested structure.

This is both a bug and a design limitation: the CTA and branding are bugs; the sparse-content policy and lack of deferred structural slots are current design limitations that become a quality bug when the onboarding contract promises capability-aware composition.

## Prioritized repair plan — no implementation in this audit

### P0 — eliminate unsafe/false conversion and internal content

| Problem | Exact root cause | Minimal fix | Files affected | Risk | Tests required |
|---|---|---|---|---|---|
| Fabricated CTA | `normalizeIntent` turns null into `website/#`; planner always pushes CTA | preserve explicit no-CTA through V1/V2 and omit CTA block; never render `#` | `normalize.ts`, `rules.ts`, `blocks-v2.ts`, contracts | medium; existing action flows must remain unchanged | no-CTA adapter, recipe, renderer and persistence regressions |
| Internal branding | `showBranding=true` is hardcoded in generated config and renderer prints it | set production branding policy explicitly false or host-owned; preserve studio previews separately | `to-template-config.ts`, `TemplateRenderer.tsx` or host policy | medium; affects published pages | production/public renderer and preview branding tests |

### P1 — restore semantic composition quality

| Problem | Exact root cause | Minimal fix | Files affected | Risk | Tests required |
|---|---|---|---|---|---|
| Category loss | adapter uses profession as `business_type` and puts profession in `businessOther` | add an explicit supported category field to the host-to-engine mapping or map category before keyword inference | `engine-v2-adapter.ts`, `internal-entrypoint.ts`, contracts | medium; changes family/archetype outcomes | category mapping matrix |
| Selected capabilities unreachable | selected features never become content inventory or structural requirements | pass capability availability separately from concrete content; planner may create safe deferred section shells without fake data | adapter, host input, context/planner | high; must avoid fabricated content | four-capability fixture and content-absence tests |
| Auto density collapses page | `contentDensityOf` uses only concrete entries and ignores selected capabilities/style | resolve density from explicit density + capability count + premium intent, with concrete-content gating | host input, density resolver, `to-recipe-v2.ts` | medium | auto/simple/complete matrix |
| Scoring accepts sparse ties | no selected-feature fulfillment or richness penalty/bonus in `scoreRecipe` | add capability-fit and composition-richness terms while retaining accessibility/mobile floors | `quality-score.ts`, candidate tests | medium | candidate ranking and regression score snapshots |
| Default preset dominates | preset family/axes can override semantic category and no candidate objective checks requested needs | preserve intent constraints as hard/strong selection inputs and compare composition coverage | `candidates.ts`, `strategy.ts`, recipe selection | medium | winner-selection fixtures |

### P2 — content follow-up UX and premium tuning

- Add a follow-up collection flow for concrete services/products/social/link data.
- Keep missing data honest: deferred slots must be visibly empty-state-safe, never fake products, URLs or testimonials.
- Strengthen premium as a composition signal after semantic coverage is corrected: layout richness, hierarchy, spacing, frames, texture and motion should change coherently.

## Required final fields

- ENGINE_EXECUTION: PASS
- INPUT_MAPPING: FAIL — semantic mapping loss proven
- WINNING_RECIPE_ID: `clean_professional#1.0`
- WINNING_LAYOUT_ID: `executive`
- WINNING_SCORE: `87`
- CANDIDATE_COUNT: `52 evaluated / 3 returned`
- GENERATED_BLOCK_COUNT: `2 canonical blocks`
- GENERATED_BLOCK_TYPES: `text`, `cta`
- SKIPPED_CAPABILITIES: banner image, hero block, stats, services, testimonials, pricing, FAQ, gallery, portfolio, video, advanced unsupported backgrounds
- AUTO_DENSITY_RESOLUTION: `compact`
- PREMIUM_SIGNAL_EFFECTIVE: `PARTIAL`
- CTA_FABRICATED: YES
- CTA_SOURCE: `normalize.ts` null-action fallback + `rules.ts` enabled CTA + `blocks-v2.ts` goal headline
- PLACEHOLDER_HASH_USED_VISIBLY: YES
- INTERNAL_BRANDING_LEAK: YES
- BRANDING_SOURCE: `to-template-config.ts` enables it; `TemplateRenderer.tsx` prints it
- DEFAULT_OR_DEMO_RECIPE_USED: `NO` for demo; `YES` for fallback-dominated selection behavior
- FIRST_QUALITY_DIVERGENCE_STAGE: Onboarding V2 → Engine V2 adapter mapping
- PRIMARY_ROOT_CAUSE: onboarding signal gap / input mapping loss
- SECONDARY_ROOT_CAUSES: content availability policy, density resolution, scoring, CTA placeholder leak, internal branding leak
- BUG_OR_DESIGN_LIMITATION: both
- RECOMMENDED_REPAIR_ORDER: P0 CTA + branding, P1 semantic mapping + capability-aware density/planning/scoring, P2 content intake + premium tuning
- FILES_MODIFIED: NONE (code); report created only
- P1_ENGINE_GENERATION_QUALITY: ROOT_CAUSE_IDENTIFIED
