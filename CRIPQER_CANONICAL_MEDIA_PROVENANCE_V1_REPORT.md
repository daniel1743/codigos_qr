# CRIPQER CANONICAL MEDIA PROVENANCE V1

**Task ID:** `CRIPQER_CANONICAL_MEDIA_PROVENANCE_V1`  
**Status:** `PASS — ADDITIVE CONTRACT EXTENSION`  
**Success gate:** `CRIPQER_CANONICAL_MEDIA_PROVENANCE_V1_PASS_FROZEN`

## Implemented

- Added optional `MediaProvenanceV1` to canonical `HeroMediaContent`.
- Supported origins: `owner`, `contextual_stock`, `legacy_unknown`.
- Supported stock providers: `unsplash`, `pexels`.
- Preserved provider asset ID, source page, creator and attribution metadata.
- Added validator checks for origin/provider compatibility and text metadata.
- Added URL warnings for source/creator URLs without rejecting legacy media.
- Threaded `origin: owner` from onboarding banner media into the generated hero.
- Kept rendering/layout unchanged; provenance is metadata only.
- No API calls, provider search, storage changes, DB migration or schema-version bump.

## Compatibility and safety

Documents without provenance remain valid and are interpreted as legacy media.
Owner media cannot declare a stock provider. Contextual stock requires either
Unsplash or Pexels. No secret, authorization header, token or credential is
part of the canonical type.

The existing canonical persistence path serializes the full `editorConfig`
JSON and the editor uses nested immutable patches, so the additive nested field
travels with the hero media and is not involved in layout decisions.

## Verification

- Provenance contract tests: added for legacy, owner, Unsplash, Pexels and
  invalid provider combinations.
- `npx tsc --noEmit`: PASS.
- Existing provider test suite: one unrelated environment-sensitive test fails
  when `PEXELS_API_KEY` is already configured; provider implementation was not
  changed by this task.
- No Git history or remote state changed.

## Regression scope

The blocked contextual-media task can now safely carry a selected stock asset
through the canonical hero surface without representing it as owner media.
Provider search/injection remains intentionally out of scope for this task.
