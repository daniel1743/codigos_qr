# Cripqer — Power Editor Source-of-Truth Map

Date: 2026-09-03  
Status: **V2 source confirmed; host integration not started**

## Decision

The manually copied Power Editor V2 snapshot is the authoritative source for
the Power Editor contract and studio. It must be copied unchanged only in a
separately authorized migration checkpoint. The current host remains on its
existing Basic Editor and Engine V1 surfaces.

No legacy files were deleted, no V2 contract was modified, and no Engine V2
code was copied into the current host during this reconciliation.

## Generation map

| Generation          | Authoritative path                                        | Current state                         | Runtime/route status            |
| ------------------- | --------------------------------------------------------- | ------------------------------------- | ------------------------------- |
| Basic Editor        | `src/components/editor/` and `src/routes/editor.tsx`      | Active and protected                  | Current host `/editor`          |
| Engine V1           | `src/lib/parametric-engine/`                              | Active and preserved                  | Existing current-host consumers |
| Power Editor V2     | `PROYECTO PARA INTEGRA A QR/src/premium-template-studio/` | Confirmed authoritative frozen source | Not imported by current host    |
| Engine V2 companion | `PROYECTO PARA INTEGRA A QR/src/lib/parametric-engine/`   | Confirmed companion source            | Not imported by current host    |

There is no separate executable legacy Power Editor root confirmed in the
current host. The current `src/components/editor/` path is Basic Editor code,
not a Power Editor contract or migration source.

## V2 contract confirmation

The authoritative nested snapshot contains the expected contract and engine
files:

- `PROYECTO PARA INTEGRA A QR/src/premium-template-studio/types/index.ts`
- `PROYECTO PARA INTEGRA A QR/src/premium-template-studio/constants/layouts.ts`
- `PROYECTO PARA INTEGRA A QR/src/premium-template-studio/constants/blockDefinitions.ts`
- `PROYECTO PARA INTEGRA A QR/src/premium-template-studio/engine/BlockRegistry.ts`
- `PROYECTO PARA INTEGRA A QR/src/premium-template-studio/engine/TemplateValidator.ts`

The snapshot also contains `BioTemplateConfig`, 37 registered block types, 9
layout IDs, 29 section presets, and 30 editor recipes according to its local
capability matrix. These are source-snapshot findings; they are not yet
current-host runtime capability claims.

Expected Engine V2 imports:

```text
@/premium-template-studio/types
@/premium-template-studio/constants/layouts
@/premium-template-studio/constants/blockDefinitions
@/premium-template-studio/engine/BlockRegistry
@/premium-template-studio/engine/TemplateValidator
```

| Resolution check                               | Result  |
| ---------------------------------------------- | ------- |
| Resolve within nested source snapshot          | **YES** |
| Resolve in current host before controlled copy | **NO**  |
| V2 contract modified during this audit         | **NO**  |

## Media and AI capability status

The nested Engine V2 source includes server-oriented media and AI modules and
corresponding tests/reports:

| Capability          | Present in authoritative nested source | Callable from current host |
| ------------------- | -------------------------------------: | -------------------------: |
| Pexels              |                                **YES** |                     **NO** |
| Unsplash            |                                **YES** |                     **NO** |
| Media Curator       |                                **YES** |                     **NO** |
| DeepSeek Supervisor |                                **YES** |                     **NO** |

Relevant nested source areas include `src/lib/parametric-engine/media/`,
`src/lib/parametric-engine/ai/`, and the associated provider/guardrail/server
files. The current host has not received these modules, and this map does not
authorize copying them.

## Route and import map

### Current host

- `/editor` resolves to the Basic Editor.
- No current-host Power Editor route was found.
- No current-host public V2 renderer route was found.
- No current-host import of `@/premium-template-studio` was found.
- Public onboarding, landing, navigation, auth, and existing routes remain
  unchanged by this task.

### Nested source snapshot

- `/` imports/renders the nested `PremiumTemplateStudio`.
- `/p/$slug` imports the nested `PublicTemplateRenderer` and
  `BioTemplateConfig`.
- `/__dev/engine-v2-playground` imports the nested Engine V2 playground.

These nested routes are evidence of the source snapshot and are not current
host production routes.

## Frozen ZIP and source relationship

The nested snapshot contains:

`PROYECTO PARA INTEGRA A QR/CRIPQER_POWER_EDITOR_V2_FROZEN.zip`

SHA-256:
`30B6391A051BEE65A18D04904554C0AD0ED53C2ED01F5B8C313C7EB988B3BA7C`

The archive is a frozen transport/backup artifact. The unpacked nested
`src/premium-template-studio/` directory is the source path to use for a
future controlled import; the ZIP is not a runtime dependency.

## Engine migration precheck

| Gate                                                      | Result                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------- |
| V2 Power Editor contract files present in source snapshot | **YES**                                                                   |
| Expected Engine V2 imports resolve in source snapshot     | **YES**                                                                   |
| Expected imports resolve in current host now              | **NO — pending controlled host placement**                                |
| Power Editor V2 copied into current host                  | **NO**                                                                    |
| Engine V2 copied into current host                        | **NO**                                                                    |
| Legacy files deleted                                      | **NO**                                                                    |
| Migration gate                                            | **READY_FOR_ENGINE_COPY after host placement; do not copy in this audit** |

The gate does not authorize migration. Before copying Engine V2, the exact
Power Editor contract must be placed in the expected host location and the
supplied self-checks must be rerun without changing either contract.

## Rules for the next authorized phase

- Treat the nested Power Editor V2 source as authoritative.
- Copy the V2 contract/studio unchanged under the explicitly approved host
  namespace; do not merge it with old editor code.
- Keep Engine V2 isolated from `src/lib/parametric-engine/` Engine V1.
- Do not use Basic Editor types or renderers as the Power Editor contract.
- Preserve opaque `BioTemplateConfig` acceptance and canonical boundaries.
- Do not add a public Power route or change public onboarding/navigation in this
  source-of-truth phase.
- Re-run contract, engine, media/AI, and route checks after controlled import.

## Reconciliation result

| Item                                              | Result                                                    |
| ------------------------------------------------- | --------------------------------------------------------- |
| Authoritative Power Editor V2 found               | **YES**                                                   |
| Authoritative path                                | `PROYECTO PARA INTEGRA A QR/src/premium-template-studio/` |
| Separate legacy Power Editor path in current host | **NONE CONFIRMED**                                        |
| Current Basic Editor preserved                    | **YES**                                                   |
| Current Engine V1 preserved                       | **YES**                                                   |
| Current host code changed                         | **NO**                                                    |
| Legacy files deleted                              | **NO**                                                    |
