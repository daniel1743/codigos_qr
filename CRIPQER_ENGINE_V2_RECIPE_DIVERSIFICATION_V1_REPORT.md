# CRIPQER ENGINE V2 — RECIPE DIVERSIFICATION V1

**Task ID:** `CRIPQER_ENGINE_V2_RECIPE_DIVERSIFICATION_V1`  
**Type:** `CONTROLLED_ENGINE_V2_STRATEGY_FIX + DETERMINISTIC_REGRESSION`  
**Agent:** CODEX  
**Branch:** `feat/basic-editor-editorial-canvas-ui`

## SUCCESS GATE

`CRIPQER_ENGINE_V2_RECIPE_DIVERSIFICATION_PASS_FROZEN`

## ROOT CAUSE CONFIRMATION

Fase 0 confirmó la evidencia de la auditoría:

- `inferArchetype(normalizedIntent)` continúa existiendo y clasifica
  correctamente los tres escenarios.
- `ArchetypeStrategy.family_bias` continúa definido en
  `src/lib/parametric-engine-v2/archetypes.ts`.
- `buildDesignProfile()` calculaba personalidad, categoría y objetivo, pero
  ignoraba completamente `family_bias`.
- La selección existente continúa usando `selectFamily()` para la variante
  base y `selectFamilyVariant()` para variantes, con el mismo desempate
  `FAMILY_PRIORITY`.
- No se encontró un refactor concurrente de la estrategia ni se modificaron las
  capas congeladas.

El contrato numérico es compatible directamente: ambos lados usan
`Partial<Record<FamilyId, number>>` y puntuaciones numéricas por
`FamilyId`. No fue necesario inventar coeficientes, convertir escalas ni
cambiar el contrato de arquetipos.

## EXISTING FAMILY_BIAS CONTRACT

La integración usa exclusivamente los valores existentes:

| Archetype | Existing `family_bias` |
| --- | --- |
| `appointment_service` | `luxury +12`, `creator +8`, `corporate +8` |
| `retail` | `energetic +12`, `corporate +10`, `creator +6` |
| `portfolio_service` | `editorial +16`, `creator +12`, `minimal +8` |

El flujo ahora es:

```text
NormalizedIntent
  → inferArchetype()
  → ARCHETYPE_STRATEGIES[archetype]
  → existing family_bias
  → additive family scores
  → existing family selection
```

La suma se ejecuta después de las tablas existentes de personalidad, categoría y
objetivo. No reemplaza ninguna de ellas.

## IMPLEMENTATION

Se añadió en `src/lib/parametric-engine-v2/strategy.ts`:

```ts
const archetype = inferArchetype(intent);
apply(ARCHETYPE_STRATEGIES[archetype].family_bias);
```

La implementación:

- reutiliza una única inferencia de arquetipo;
- reutiliza el mapa de estrategias existente;
- aplica un delta aditivo únicamente a las familias declaradas;
- conserva selección, variantes, desempate y determinismo;
- no agrega familias, arquetipos, tokens visuales ni capacidades canónicas.

El fixture de expectativas congeladas se actualizó únicamente para reflejar el
cambio conductual legítimo de `freelancer-portfolio-minimal`, que pasa a
`editorial` por su arquetipo ya existente `portfolio_service`. No se
modificó la lógica del self-check.

## BEFORE / AFTER FAMILY SCORES

Las puntuaciones **Before** son las producidas por la fórmula anterior sin
aplicar el bias. Las **After** son las mismas puntuaciones más el
`family_bias` existente.

| Scenario | Archetype | Before family scores | After family scores | Before selected family | After selected family | Recipe / preset | Canonical valid? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A — services | `appointment_service` | `editorial 30, luxury 0, corporate 62, minimal 32, creator 0, energetic 0` | `editorial 30, luxury 12, corporate 70, minimal 32, creator 8, energetic 0` | `minimal` | `minimal` | `engine#2.1` / none | YES |
| B — catalog | `retail` | `editorial 24, luxury 0, corporate 54, minimal 24, creator 10, energetic 14` | `editorial 24, luxury 0, corporate 64, minimal 24, creator 16, energetic 26` | `minimal` | `editorial` | `engine#2.0` / none | YES |
| C — portfolio | `portfolio_service` | `editorial 40, luxury 0, corporate 46, minimal 34, creator 10, energetic 0` | `editorial 56, luxury 0, corporate 46, minimal 42, creator 22, energetic 0` | `editorial` | `editorial` | `editorial_calm#2.1` / `editorial_calm` | YES |

### Why the selected family won

- **A:** the bias raises luxury, creator and corporate, but the existing
  candidate ranking and content/action quality still select the deterministic
  minimal candidate. This is not an ignored archetype anymore: the score table
  contains the appointment-service deltas.
- **B:** retail raises energetic, corporate and creator. The winning candidate
  changes from the former minimal result to the existing editorial candidate,
  producing a materially different treatment with no new family or forced rule.
- **C:** portfolio already had a strong editorial direction; the existing
  portfolio bias increases editorial to 56, so editorial remains the
  deterministic winner.

A and B no longer converge because the archetype signal is ignored. They still
have different score tables and different selected recipes. No artificial
diversity assertion was introduced.

## SCENARIO A SERVICES

Input remains the forensic `SERVICE_BOOKING` case:

- `Peluquería y belleza`;
- goal `book` at Smart Pages and `leads` after the frozen PAGES_7
  transformation;
- two services with owner prices;
- real WhatsApp contact.

Archetype inference remains `appointment_service`. The bias contributes
`luxury +12`, `creator +8` and `corporate +8`. The real generated config
remains canonical-valid and preserves the two service entries and their prices.
The final family is still `minimal`, but this is the existing candidate
selection consequence, not the old “bias unused” state.

## SCENARIO B CATALOG

Input remains the forensic `RETAIL_CATALOG` case:

- `Tienda de ropa`;
- goal `sell`;
- two products with owner prices, media and destinations;
- supplied cover and WhatsApp contact.

Archetype inference remains `retail`. The bias contributes
`energetic +12`, `corporate +10` and `creator +6`. The selected recipe is
now `editorial` with the existing editorial visual treatment, including
editorial typography/cards/motion values already supported by Engine V2. The
generated canonical document remains valid and owner product facts survive.

## SCENARIO C PORTFOLIO

Input remains the forensic `CREATIVE_PORTFOLIO` case:

- `Fotografía`;
- goal `showcase` / Engine goal `portfolio`;
- two projects with owner media and destinations;
- supplied cover and contact.

Archetype inference remains `portfolio_service`. The existing bias reinforces
editorial, creator and minimal, with editorial receiving the largest delta.
The selected recipe remains `editorial_calm` / `editorial`, canonical-valid,
and preserves project media and destinations.

## DETERMINISM

The implementation is pure and deterministic:

- no `Math.random`;
- no timestamp participates in scoring or selection;
- no unstable collection ordering was introduced;
- identical normalized intent and options produce identical scores, family,
  recipe fingerprint and canonical config.

The targeted test compares two generations from the same intent and a
`structuredClone` of that intent. Both family and recipe fingerprint match for
all three scenarios.

## CANONICAL VALIDATION

The real Engine V2 path was exercised through
`generatePowerEditorTemplate()`, which runs candidate generation, recipe
construction and `toBioTemplateConfig()`. Each scenario passed
`validateTemplate(config).valid === true`.

The existing forensic chain was also rerun through:

```text
OnboardingIntentV2
  → OwnerContentInput
  → PageGenerationRequest
  → PagePlanV1
  → Smart Pages host map
  → PAGES_7 adapter
  → Engine V2
  → BioTemplateConfig
  → validateTemplate
```

Results: A/B/C **3/3 canonical-valid**. Owner names/content, prices, supplied
media, CTA/contact and destinations remained preserved. No persistence or DB
write occurred.

## VISUAL DIFFERENTIATION

The renderer was not changed. The existing `PublicTemplateRenderer` path
renders the post-fix canonical configurations faithfully.

Observed post-fix recipe differences:

| Property | A services | B catalog | C portfolio |
| --- | --- | --- | --- |
| Family | minimal | editorial | editorial |
| Layout / pattern | compact / conversion_first | compact / conversion_first | editorial / editorial_stack |
| Typography | Trebuchet MS, 30/600 | Georgia, 44/700 | Georgia, 44/700 |
| Cards | minimal | flat | flat |
| Buttons | solid, 58px | solid, 58px | solid, 54px |
| Background | solid, green light | solid, white | solid, warm light |
| Motion | minimal / fade | editorial / slide-up | editorial / slide-up |
| Content blocks | services | productGrid | portfolio |

Compared with the forensic baseline, the catalog now leaves the former
minimal-family convergence and uses the existing editorial treatment. The
renderer therefore makes the improvement observable without any renderer or
canonical expansion.

The public-renderer smoke in the forensic regression passed for all three
documents. The current raster QA fixture media remains evidence-only and is not
owner/commercial content.

## REGRESSION

Passed:

- targeted strategy/family-bias suite: **3/3 tests**;
- Engine V2 integration suite plus new strategy suite: **27/27 tests**;
- inter-layer regression covering Engine V2, Smart Pages 2–5, PAGES_7,
  onboarding 5A/5B and forensic A/B/C: **15 files, 137/137 tests**;
- ESLint focalizado: **passed**;
- forensic trace harness: **3/3 scenario smoke paths passed inside the
  regression**, with canonical validation and current family scores.

Known non-blocking repository warnings:

- Vite suggests native tsconfig path resolution instead of
  `vite-tsconfig-paths`;
- an existing route test lacks a `Route` export and is omitted from the
  generated route tree.

## KNOWN P2 GAPS LEFT UNCHANGED

Intentionally not fixed in this task:

1. Free-form professions still normalize to `business_category = other`.
2. `GeneratedPageInput.style` is still not threaded, so visual personality
   remains `professional` in the forensic host path.
3. Smart Pages bookings still becomes Engine `leads` through the existing
   objective mapping.
4. `salesMode` is not fully threaded into Engine strategy.
5. Smart Pages section order and hero hints remain host-level deferred signals.
6. Textures, decorative frames, gradients, new card/button styles, additional
   palettes and new typography systems were not added.

These remain separate future decisions. The result isolates the gain from
activating family bias alone.

## FILES CHANGED

- `src/lib/parametric-engine-v2/strategy.ts` — production change, additive
  family-bias application.
- `src/lib/parametric-engine-v2/__tests__/strategy-family-bias.test.ts` —
  targeted unit/integration/forensic assertions.
- `src/lib/parametric-engine-v2/fixtures/expected-recipes.ts` — one frozen
  expected summary updated for the intended behavior change.
- `CRIPQER_ENGINE_V2_RECIPE_DIVERSIFICATION_V1_REPORT.md` — this report.

No Smart Pages, PAGES_7, onboarding, canonical, renderer, route, persistence,
database, migration or dependency files were changed by this task.

## ARCHITECTURE GATES

- `FAMILY_BIAS_ACTIVE = YES`
- `NEW_FAMILY_CREATED = NO`
- `NEW_ARCHETYPE_CREATED = NO`
- `SMART_PAGES_CHANGED = NO`
- `HOST_MAPPER_CHANGED = NO`
- `PAGES_7_CHANGED = NO`
- `CANONICAL_CHANGED = NO`
- `RENDERER_CHANGED = NO`
- `DB_CHANGED = NO`
- `DEPENDENCY_ADDED = NO`
- `DETERMINISM_PRESERVED = YES`
- `FABRICATED_OWNER_DATA = NO`
- `GIT_MUTATION_PERFORMED = NO`

## NEXT RECOMMENDATION

This task does not start another task automatically.

If the improved catalog differentiation is accepted, return to the Smart Pages
roadmap / `SP6`. If output remains too generic, inspect the existing P2 gaps in
this order:

1. PAGES_7 category normalization;
2. `style` / visual-personality threading;
3. bookings goal preservation;
4. Engine V2 visual authoring expansion.

**Primary next task:** `SMART_PAGES_6_MINISITE_MULTI_PAGE_FANOUT` only after explicit
approval.

