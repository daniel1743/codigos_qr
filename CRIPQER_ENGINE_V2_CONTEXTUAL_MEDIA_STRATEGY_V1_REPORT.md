# CRIPQER ENGINE V2 — CONTEXTUAL MEDIA STRATEGY V1

**Task ID:** `CRIPQER_ENGINE_V2_CONTEXTUAL_MEDIA_STRATEGY_V1`  
**Status:** `RESUMED — IMPLEMENTED SERVER-SIDE CONTEXTUAL MEDIA PATH`  
**Required gate:** `CRIPQER_ENGINE_V2_CONTEXTUAL_MEDIA_STRATEGY_RUNTIME_VISUAL_PASS_FROZEN`

## Phase 0 audit

The repository already contains one provider abstraction and both provider
clients. No duplicate API clients were created.

| Area               | Evidence                                                  | Result                                                                  |
| ------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Unsplash           | `src/lib/parametric-engine-v2/media/unsplash-provider.ts` | Present; server secret lookup and normalized photo metadata             |
| Pexels             | `src/lib/parametric-engine-v2/media/pexels-provider.ts`   | Present; server secret lookup and normalized photo/video metadata       |
| Shared abstraction | `media/types.ts`, `media/curator.ts`                      | Present; deterministic role/provider routing and ranking                |
| Secret boundary    | `src/server/integrations/server-fetch.ts`                 | Server-only `process.env` lookup                                        |
| Attribution        | Provider normalizers                                      | Preserves creator, creator URL and source page                          |
| Existing tests     | `media-providers.test.ts`                                 | Covers normalization, missing keys, empty results and provider fallback |

## Previously resolved blockers

### 1. Contextual origin cannot be represented safely

The canonical hero media contract is `HeroMediaContent` in
`src/premium-template-studio/types/index.ts`. It currently contains only:

`url`, `blur`, `fit`, and `position`.

The generated canonical config therefore has no representable distinction
between an owner-uploaded image and a stock image. Injecting a selected
Unsplash/Pexels URL into `profile` or `content.bannerImage` would make stock
media indistinguishable from owner media after persistence and editor reload.
That violates the task requirements:

- contextual stock must never be represented as `OwnerMediaReference`;
- owner and contextual origin must remain distinguishable;
- no canonical schema change is allowed;
- STOP_IF applies when origin cannot be represented safely.

### 2. The current server function is explicitly QA-only

`src/lib/parametric-engine-v2/media/server.ts` currently rejects production
execution with:

`Pexels media curation is available only in the local QA playground`

Removing that guard would be necessary for the requested live generation path,
but it would still leave blocker 1 unresolved. Provider calls must remain
server-side; no client-side secret workaround is acceptable.

Both blockers were resolved by `CRIPQER_CANONICAL_MEDIA_PROVENANCE_V1` and the
server boundary is now used by the real onboarding generation path. Provider
calls remain server-only and selected assets carry `contextual_stock` provenance
through the canonical hero media field.

## Changes made

The existing provider modules, contextual decision boundary, Engine V2 hero
threading, onboarding server generation path and focused provenance tests were
updated. No provider client, storage architecture, DB migration or Git history
was added or rewritten.

## Gate status

- `CRIPQER_OWNER_MEDIA_LIVE_UPLOAD_RUNTIME_VERIFIED_FROZEN`: documented as PASS
  in `CRIPQER_OWNER_MEDIA_LIVE_UPLOAD_SMOKE_V1_REPORT.md`.
- `CRIPQER_PREMIUM_VISUAL_RUNTIME_ALIGNMENT_PASS_FROZEN`: documented as PASS in
  `CRIPQER_PREMIUM_VISUAL_RUNTIME_ALIGNMENT_FIX_V1_REPORT.md`.
- `CRIPQER_ENGINE_V2_CONTEXTUAL_MEDIA_STRATEGY_RUNTIME_VISUAL_PASS_FROZEN`:
  **CODE PATH IMPLEMENTED; live visual QA requires provider keys and browser
  execution**.
