# Cripqer — Power Editor V2 Host Contract Map

Date: 2026-09-03  
Status: **installed, type-connected, dormant; no public exposure**

## Installed contract

| Contract            | Host path                                                   | Status                           |
| ------------------- | ----------------------------------------------------------- | -------------------------------- |
| `BioTemplateConfig` | `src/premium-template-studio/types/index.ts`                | **RESOLVED**                     |
| Layouts             | `src/premium-template-studio/constants/layouts.ts`          | **RESOLVED — 9**                 |
| Block definitions   | `src/premium-template-studio/constants/blockDefinitions.ts` | **RESOLVED — 37**                |
| Block registry      | `src/premium-template-studio/engine/BlockRegistry.ts`       | **RESOLVED**                     |
| Template validator  | `src/premium-template-studio/engine/TemplateValidator.ts`   | **RESOLVED**                     |
| Section presets     | `src/premium-template-studio/constants/sectionPresets.ts`   | **RESOLVED — 29**                |
| Recipes             | `src/premium-template-studio/templates/recipeRegistry.ts`   | **RESOLVED — 30 source recipes** |

The registry tests report 37 block types, 29 section presets, and 42 template
definitions. The source capability matrix's frozen recipe count is 30; both
facts are retained rather than conflated.

## Required Engine import targets

```text
@/premium-template-studio/types
@/premium-template-studio/constants/layouts
@/premium-template-studio/constants/blockDefinitions
@/premium-template-studio/engine/BlockRegistry
@/premium-template-studio/engine/TemplateValidator
```

All five targets resolve in the current Cripqer host after installation. No
Engine V2 implementation was copied in this phase.

## Canonical page boundary

`src/lib/canonical-page/contract.ts` owns the host envelope:

```text
schemaVersion + editorConfig
```

The host now imports `BioTemplateConfig` with `import type` and defines:

```ts
type CanonicalEditorConfigV1 = BioTemplateConfig;
```

This is type-only integration. Runtime validation remains the existing
object/schema-version envelope validation. It does not validate or rewrite the
internal Power Editor JSON, and it does not change Basic patch ownership.

Legacy Basic-only JSON remains readable through the existing legacy fallback.
The canonical envelope remains `schemaVersion: 1` plus `editorConfig`.

## Ownership matrix

| Surface                            | Owner                                        | V2 phase result                         |
| ---------------------------------- | -------------------------------------------- | --------------------------------------- |
| Basic Editor UI and save semantics | Current host Basic Editor                    | Preserved, not connected to V2 controls |
| Power Editor config contract       | `src/premium-template-studio/types/index.ts` | Installed unchanged                     |
| Power Editor renderer              | `src/premium-template-studio/engine/`        | Installed unchanged, dormant            |
| Canonical envelope                 | `src/lib/canonical-page/contract.ts`         | Type-connected only                     |
| Engine V1                          | `src/lib/parametric-engine/`                 | Preserved and isolated                  |
| Engine V2                          | Nested authoritative companion source        | Not copied                              |

## Route and exposure map

Current host:

- `/editor` remains Basic Editor.
- No Power Editor route was added.
- No public V2 renderer route was added.
- No navbar/menu link was added.
- No onboarding connection or auto-conversion was added.
- No production renderer, auth, billing, database schema, or public navigation
  was changed.

The copied module can be imported internally in a future authorized phase, but
the current host has no route consumer. The nested source routes are not copied
and are not current-host production routes.

## Capabilities confirmed in the installed contract

The frozen source and passing tests confirm the contract surface for banners,
image backgrounds, galleries, portfolios, video, cards, 75/25 media cards,
textures, frames, glass, gradients, shadows, responsive behavior, motion,
sticky/floating positioning, and Lucide icons. These capabilities are dormant
until an explicitly authorized internal integration exposes them.

## External dependency map

| Dependency                | Host status                       |
| ------------------------- | --------------------------------- |
| React / React DOM         | Already installed                 |
| `lucide-react`            | Already installed                 |
| `qrcode-generator@2.0.4`  | Added as exact runtime dependency |
| `vitest@4.1.11`           | Added as exact test dependency    |
| `happy-dom@20.11.6`       | Added as exact test dependency    |
| `@playwright/test@1.62.1` | Added as exact test dependency    |

No provider/API secret, media provider, auth, billing, or database dependency
was added by this phase.

## Regression contract

- Basic Editor remains the only `/editor` surface.
- Basic save continues to use the safe patch adapter.
- Basic writes do not own unknown/premium canonical fields.
- `profile_links` stable IDs remain outside this Power Editor installation.
- Power Editor is not imported by the Basic Editor.
- Current Engine V1 is not replaced or modified.
