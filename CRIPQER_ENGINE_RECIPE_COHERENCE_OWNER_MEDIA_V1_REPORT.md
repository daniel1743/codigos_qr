# CRIPQER ENGINE RECIPE COHERENCE OWNER MEDIA V1

**Task ID:** `CRIPQER_ENGINE_RECIPE_COHERENCE_OWNER_MEDIA_V1`  
**Status:** `IMPLEMENTED — TARGETED RECIPE/MEDIA COHERENCE FIX`  
**Source trace:** `CRPQ-BLACKBOX-EMGL`

## Repaired boundaries

- An existing owner cover now resolves through the existing `banner-first`
  media strategy and cannot be demoted to `minimal-no-media` by candidate hash.
- `visual_cover` now activates the registered existing Hero block when owner
  media is present. The renderer suppresses only the duplicate profile header
  for that authored Hero; no new block or renderer system was introduced.
- The existing full-width layout receives the established wide content token
  (`680px`) instead of the editorial generic `600px` token.
- Owner avatar is now carried from Smart Pages business media through
  `GeneratedPageInput` and the existing Engine `userMedia.avatarUrl` seam.

## Preserved behavior

- `beauty`, `appointment_service`, family bias and deterministic candidate
  ranking remain unchanged.
- Owner media remains owner media; no Unsplash/Pexels request or strategy was
  added.
- Existing canonical validation, persistence and renderer contracts remain in
  use. The Hero is the already registered renderer capability.

## Content-aware composition

- A single supplied service with a short action set now resolves to compact
  density; medium service inventories retain their richer density.
- When the Hero owns identity content, the planner omits the duplicate quote
  and duplicate CTA blocks. Contact metadata remains available as subordinate
  information.
- The Hero uses the existing `trueFullBleed` layout flag and no decorative
  frame, so the owner cover is the focal surface rather than a framed card.
- Non-owner/banner fixtures retain their deterministic media-strategy variety;
  only owner-marked covers receive the `banner-first` guarantee.

## Verification

- `premium-visual-authoring.test.ts`: **PASS — 7/7**.
- Related Engine and PAGES_7 integration suites: **PASS — 43/43**.
- Coverage includes owner cover → `banner-first`, `visual_cover` → Hero,
  avatar/cover URL threading, canonical config output and `validateTemplate`.
- `npx tsc --noEmit`: not green because the repository currently reports
  unrelated pre-existing errors across admin, basic-template, inspector,
  route and persistence test files. No task-specific error was reported in
  the directed test.
- Authenticated `/onboarding-test` visual rerun and editor reload evidence were
  not executed in this environment; runtime visual gate remains pending.
